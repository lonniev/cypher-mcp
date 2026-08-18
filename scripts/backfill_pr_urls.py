#!/usr/bin/env python3
"""One-time operator migration: promote i.pr_url strings to :PullRequest nodes.

The factory graph used to record a fix PR as a flat `i.pr_url` string on the
Issue. That can represent at most one PR per issue and can't be traversed, so
PRs are now first-class :PullRequest nodes linked (:PullRequest)-[:FIXES]->(:Issue)
(see factory_vocabulary.py). `link_pr` writes that edge going forward; this heals
the issues already carrying a pr_url string, then removes the string (clean break).

The migration is a single idempotent, graph-side write — the pr_url already holds
the full GitHub URL, so unlike the issue-URL backfill there is no owner to resolve
and no per-row round trip. It parses the PR number out of `.../pull/<n>[/...]`,
MERGEs the :PullRequest by (repo_name, number) — matching link_pr's identity so no
duplicate is minted — sets a skeleton (url + state='open' + timestamps) ON CREATE,
MERGEs the FIXES edge, and REMOVEs i.pr_url. Re-running is safe (MERGE + a pr_url
that's already gone simply matches nothing).

Writes go through the operator's own ad-hoc query path (create_query ->
execute_query_by_key -> delete_query), the same one the seed and issue-URL backfill
use. --dry-run reads the candidates and prints the plan but performs NO writes.

Usage:
    # preview what WOULD migrate — reads the graph, no writes:
    OPERATOR_NSEC=nsec1... python scripts/backfill_pr_urls.py --dry-run \
        --operator-npub npub1xdv5j...

    # apply:
    OPERATOR_NSEC=nsec1... python scripts/backfill_pr_urls.py \
        --url https://cypher-mcp.fastmcp.app/mcp \
        --operator-npub npub1xdv5j...
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from typing import Any

SLUG = "cypher"
READ_KEY = "_backfill_pr_scan"
WRITE_KEY = "_backfill_pr_migrate"

# The PR number is the first path segment after '/pull/', so a canonical URL and one
# with a trailing '/files' both parse. A non-'/pull/' URL (an issue URL that somehow
# landed in pr_url) yields null and is skipped rather than minting a bogus node.
_PRNUM = "toInteger(split(split(i.pr_url, '/pull/')[-1], '/')[0])"

SCAN_CYPHER = (
    "MATCH (i:Issue) WHERE i.pr_url IS NOT NULL AND i.pr_url CONTAINS '/pull/' "
    f"WITH i, {_PRNUM} AS prnum WHERE prnum IS NOT NULL "
    "RETURN i.repo_name AS repo_name, i.number AS number, i.pr_url AS pr_url, prnum AS pr_number "
    "ORDER BY repo_name, number"
)

# Same identity + skeleton as link_pr's ON CREATE, so an already-mirrored PR is untouched.
MIGRATE_CYPHER = (
    "MATCH (i:Issue) WHERE i.pr_url IS NOT NULL AND i.pr_url CONTAINS '/pull/' "
    f"WITH i, {_PRNUM} AS prnum WHERE prnum IS NOT NULL "
    "MERGE (p:PullRequest {repo_name: i.repo_name, number: prnum}) "
    "ON CREATE SET p.url = i.pr_url, p.state = 'open', "
    "              p.created_at = timestamp(), p.updated_at = timestamp() "
    "MERGE (p)-[:FIXES]->(i) "
    "REMOVE i.pr_url "
    "RETURN i.repo_name AS repo_name, i.number AS number, prnum AS pr_number"
)


async def _run(url: str, operator_npub: str, operator_nsec: str, dry_run: bool) -> int:
    from fastmcp import Client
    from tollbooth.identity_proof import create_proof

    async with Client(url) as client:
        def proof(capability: str) -> str:
            return create_proof(operator_nsec, f"{SLUG}_{capability}")

        async def call(capability: str, args: dict[str, Any]) -> dict[str, Any]:
            # create_proof signs at whole-second resolution; a repeat within the same
            # second mints an identical (replayed) event, so re-sign after a tick.
            data: dict[str, Any] = {}
            for attempt in range(3):
                payload = {**args, "npub": operator_npub, "dpop_token": proof(capability)}
                res = await client.call_tool(f"{SLUG}_{capability}", payload)
                data = res.data if hasattr(res, "data") else res
                data = data if isinstance(data, dict) else {"raw": data}
                if "proof" in str(data.get("error", "")).lower() and attempt < 2:
                    await asyncio.sleep(1.1)
                    continue
                return data
            return data

        def rows_of(res: dict[str, Any]) -> list[dict[str, Any]]:
            return (res.get("rows") or res.get("results") or res.get("data") or [])

        # 1. Scan for candidates via a temporary operator read query — list_issues no
        #    longer returns pr_url (clean break), so read the raw property directly.
        created = await call("create_query", {
            "key": READ_KEY,
            "cypher_template": SCAN_CYPHER,
            "param_schema": {},
            "description": "Backfill scan: issues still carrying a pr_url string.",
            "access_mode": "read",
        })
        if created.get("error") and "exist" not in str(created.get("error")).lower():
            print(f"create_query({READ_KEY}) failed: {created.get('error')}", file=sys.stderr)
            print("Fix the cause (fund/authorize the operator npub), then re-run.", file=sys.stderr)
            return 2

        scan = await call("execute_query_by_key", {"key": READ_KEY, "params": {}})
        if scan.get("error") or scan.get("error_code"):
            await call("delete_query", {"key": READ_KEY})
            print(f"scan failed: {scan.get('error') or scan.get('error_code')}", file=sys.stderr)
            return 2
        candidates = rows_of(scan)
        print(f"{len(candidates)} issue(s) still carry a pr_url to migrate.")
        for c in candidates:
            print(f"  {c.get('repo_name')}#{c.get('number')} -> PR #{c.get('pr_number')}  ({c.get('pr_url')})")

        if dry_run:
            await call("delete_query", {"key": READ_KEY})
            print("\n--dry-run: no writes performed.")
            return 0

        if not candidates:
            await call("delete_query", {"key": READ_KEY})
            print("Nothing to migrate.")
            return 0

        # 2. Migrate in one idempotent write query.
        w = await call("create_query", {
            "key": WRITE_KEY,
            "cypher_template": MIGRATE_CYPHER,
            "param_schema": {},
            "description": "Backfill: promote i.pr_url to a :PullRequest node + FIXES edge.",
            "access_mode": "write",
        })
        if w.get("error") and "exist" not in str(w.get("error")).lower():
            await call("delete_query", {"key": READ_KEY})
            print(f"create_query({WRITE_KEY}) failed: {w.get('error')}", file=sys.stderr)
            return 2

        res = await call("execute_query_by_key", {"key": WRITE_KEY, "params": {}})
        migrated = rows_of(res)
        await call("delete_query", {"key": WRITE_KEY})
        await call("delete_query", {"key": READ_KEY})

        if res.get("error"):
            print(f"migration failed: {res.get('error')}", file=sys.stderr)
            return 2
        print(f"\nMigrated {len(migrated)} PR(s) into :PullRequest nodes and removed the pr_url strings.")
        if len(migrated) < len(candidates):
            print(f"WARNING: scanned {len(candidates)} but migrated {len(migrated)} — re-run --dry-run to inspect.",
                  file=sys.stderr)
        return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Promote i.pr_url strings to :PullRequest nodes.")
    ap.add_argument("--url", default=os.environ.get("CYPHER_MCP_URL", "https://cypher-mcp.fastmcp.app/mcp"))
    ap.add_argument("--operator-npub", default=os.environ.get("OPERATOR_NPUB", ""))
    ap.add_argument("--dry-run", action="store_true", help="print the plan; no network writes")
    args = ap.parse_args()

    if not args.operator_npub:
        print("--operator-npub (or OPERATOR_NPUB) is required.", file=sys.stderr)
        return 2

    # Even --dry-run reads the live graph, which requires a signed operator proof.
    operator_nsec = os.environ.get("OPERATOR_NSEC", "")
    if not operator_nsec:
        import getpass
        operator_nsec = getpass.getpass("Operator nsec (hidden): ")
    if not operator_nsec:
        print("no operator nsec provided", file=sys.stderr)
        return 2

    return asyncio.run(_run(args.url, args.operator_npub, operator_nsec, args.dry_run))


if __name__ == "__main__":
    raise SystemExit(main())
