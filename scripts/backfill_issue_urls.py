#!/usr/bin/env python3
"""One-time operator migration: fill i.url / i.repo_url on URL-less Issue nodes.

Older writes could mint an Issue node without its GitHub URL — `claim_issue`
declared issue_url optional, and the enrichment writes (`record_scope`,
`link_issue_to_capability`, `route_rejection`) MERGE'd an Issue, so any of them
could birth a bare node if it ran first (e.g. during the graph-agent sats
outage, when the `record_triage` that carries the URL 402'd). factory_vocabulary
now closes that leak going forward; this heals the nodes already in the graph.

Owner is resolved at RUNTIME from each repo's actual git remote (never a
hardcoded owner) — the sanctioned "retroactive cleanup" use of a real owner.
Writes go through the operator's own ad-hoc query path (create_query ->
execute_query_by_key -> delete_query), the same one the seed script uses, and
only fill where the value is currently null (coalesce) so a re-run is safe.

The migration reads the live graph to find the URL-less nodes, so it always needs
the operator nsec (env OPERATOR_NSEC, or a hidden prompt) to sign the read proof.
--dry-run reads and prints the plan but performs NO writes.

Usage:
    # preview what WOULD be filled — reads the graph, no writes:
    OPERATOR_NSEC=nsec1... python scripts/backfill_issue_urls.py --dry-run \
        --operator-npub npub1xdv5j... \
        --workspace /Users/you/Development/GitHubPersonal/DPYC

    # apply:
    OPERATOR_NSEC=nsec1... python scripts/backfill_issue_urls.py \
        --url https://cypher-mcp.fastmcp.app/mcp \
        --operator-npub npub1xdv5j... \
        --workspace /Users/you/Development/GitHubPersonal/DPYC
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

SLUG = "cypher"
SET_KEY = "_backfill_set_issue_url"


# --------------------------------------------------------------------------- #
# Pure helpers (no network; unit-testable)
# --------------------------------------------------------------------------- #

def parse_owner_repo(remote_url: str) -> tuple[str, str] | None:
    """(owner, repo) from a github remote — https or ssh form; None if not github."""
    m = re.search(r"github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?$", remote_url.strip())
    return (m.group(1), m.group(2)) if m else None


def issue_urls(owner: str, repo: str, number: int) -> tuple[str, str]:
    """(issue_url, repo_url). /issues/<n> is stable — GitHub redirects it to /pull/<n>
    for a PR, so it is correct whether the node is an issue or a PR."""
    base = f"https://github.com/{owner}/{repo}"
    return f"{base}/issues/{number}", base


# --------------------------------------------------------------------------- #
# Owner resolution — from the workspace's sibling clones' real remotes
# --------------------------------------------------------------------------- #

def _remote_owner(repo_dir: Path) -> str | None:
    try:
        out = subprocess.run(
            ["git", "-C", str(repo_dir), "remote", "get-url", "origin"],
            capture_output=True, text=True, timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if out.returncode != 0:
        return None
    parsed = parse_owner_repo(out.stdout)
    return parsed[0] if parsed else None


def owner_resolver(workspace: Path):
    """A cached repo_name -> owner resolver. Uses each repo's own clone remote when
    present; otherwise falls back to the workspace's default owner (this repo's
    remote), since the fleet shares one owner — still a real, runtime-carried owner."""
    cache: dict[str, str | None] = {}
    default = _remote_owner(Path(__file__).resolve().parent.parent)  # cypher-mcp's own remote

    def resolve(repo_name: str) -> str | None:
        if repo_name not in cache:
            cache[repo_name] = _remote_owner(workspace / repo_name) or default
        return cache[repo_name]

    return resolve


# --------------------------------------------------------------------------- #
# Driver (live)
# --------------------------------------------------------------------------- #

async def _run(url: str, operator_npub: str, operator_nsec: str,
               workspace: Path, dry_run: bool) -> int:
    from fastmcp import Client
    from tollbooth.identity_proof import create_proof

    resolve = owner_resolver(workspace)

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

        # 1. Enumerate every issue via the PUBLISHED, priced list_issues tool — it
        #    returns each issue's url, so we filter for the empty ones. Using the real
        #    tool (NOT a freshly-created, unpriced temp query — those hit the same
        #    tool_not_priced gate as any new tool) means an auth / pricing / balance
        #    failure SURFACES here instead of masquerading as "nothing to do".
        listed = await call("list_issues", {"since_ms": 0})
        if listed.get("error") or listed.get("error_code"):
            print(f"list_issues failed — cannot enumerate: "
                  f"{listed.get('error') or listed.get('error_code')}", file=sys.stderr)
            print("Fix the cause (fund/authorize the operator npub, or ensure list_issues "
                  "is priced), then re-run.", file=sys.stderr)
            return 2
        all_issues = (listed.get("rows") or listed.get("issues")
                      or listed.get("results") or listed.get("data") or [])
        if not isinstance(all_issues, list) or not all_issues:
            print(f"list_issues returned no issues (shape: {str(listed)[:160]}).", file=sys.stderr)
            return 2
        rows = [{"repo_name": r.get("repo_name"), "number": r.get("number")}
                for r in all_issues if not str(r.get("url") or "").strip()]
        print(f"{len(all_issues)} issues total; {len(rows)} without a URL.")
        if not rows:
            print("Every issue already has a URL — nothing to backfill.")
            return 0

        # 2. Resolve each issue's real URL from its repo's git remote.
        plan: list[dict[str, Any]] = []
        skipped: list[str] = []
        for r in rows:
            repo, num = r.get("repo_name"), r.get("number")
            if not repo or num is None:
                continue
            owner = resolve(str(repo))
            if not owner:
                skipped.append(f"{repo}#{num} (no owner — clone {repo} into the workspace)")
                continue
            iu, ru = issue_urls(owner, str(repo), int(num))
            plan.append({"repo_name": repo, "number": int(num), "issue_url": iu, "repo_url": ru})

        print(f"URL-less issues: {len(rows)}  |  resolvable: {len(plan)}  |  skipped: {len(skipped)}")
        for p in plan:
            print(f"  fill {p['repo_name']}#{p['number']} -> {p['issue_url']}")
        for s in skipped:
            print(f"  SKIP {s}")

        if dry_run:
            print("\n--dry-run: no writes performed.")
            return 0

        if not plan:
            return 0

        # 3. Fill via a one-shot write query — coalesce so we never clobber a real URL.
        created = await call("create_query", {
            "key": SET_KEY,
            "cypher_template": (
                "MATCH (i:Issue {repo_name: $repo_name, number: $number}) "
                "SET i.url = coalesce(i.url, $issue_url), "
                "    i.repo_url = coalesce(i.repo_url, $repo_url) "
                "RETURN i.number AS number"
            ),
            "param_schema": {
                "repo_name": {"type": "string", "required": True},
                "number": {"type": "int", "required": True},
                "issue_url": {"type": "string", "required": True},
                "repo_url": {"type": "string", "required": True},
            },
            "description": "Backfill: set an issue's GitHub URL where missing.",
            "access_mode": "write",
        })
        # "already exists" from a prior aborted run is fine; any other error is fatal.
        if created.get("error") and "exist" not in str(created.get("error")).lower():
            print(f"create_query({SET_KEY}) failed: {created.get('error')}", file=sys.stderr)
            return 2
        filled = 0
        for p in plan:
            res = await call("execute_query_by_key", {"key": SET_KEY, "params": p})
            if res.get("rows"):
                filled += 1
            else:
                print(f"  ! {p['repo_name']}#{p['number']}: {res.get('error') or res}", file=sys.stderr)

        await call("delete_query", {"key": SET_KEY})
        print(f"\nBackfilled {filled}/{len(plan)} issues.")
        if filled < len(plan):
            print(f"WARNING: {len(plan) - filled} write(s) did not confirm — see the ! lines above.",
                  file=sys.stderr)
        return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Backfill missing GitHub URLs on Issue nodes.")
    ap.add_argument("--url", default=os.environ.get("CYPHER_MCP_URL", "https://cypher-mcp.fastmcp.app/mcp"))
    ap.add_argument("--operator-npub", default=os.environ.get("OPERATOR_NPUB", ""))
    ap.add_argument("--workspace", default=os.environ.get("DPYC_WORKSPACE", str(Path(__file__).resolve().parent.parent.parent)),
                    help="Directory holding the fleet's repo clones (for owner resolution).")
    ap.add_argument("--dry-run", action="store_true", help="print the plan; no network writes, no nsec")
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

    return asyncio.run(_run(args.url, args.operator_npub, operator_nsec,
                            Path(args.workspace), args.dry_run))


if __name__ == "__main__":
    raise SystemExit(main())
