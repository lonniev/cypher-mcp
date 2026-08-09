#!/usr/bin/env python3
"""Explore a real factory write — the production path, minus the LLM.

Runs the agent keyring in-process against live cypher-mcp and calls a factory verb AS the
Journeyman, exactly as the GitHub Actions workflow will — but driven by you, with no
Anthropic and no agent LLM. It uses the Journeyman's already-funded balance and writes a
real Issue+Service node to your graph. The nsec stays in your terminal (hidden prompt or
env); nothing is stored.

Run in a REAL terminal (the hidden prompt needs a TTY):
    JOURNEYMAN_NPUB=npub1m5q... \
    cypher-mcp/.venv/bin/python cypher-mcp/scripts/explore_factory_write.py
  (it will prompt for the Journeyman nsec, hidden)

Or feed the nsec from a secure file without echoing it:
    JOURNEYMAN_NPUB=npub1m5q... JOURNEYMAN_NSEC="$(cat ~/path/to/journeyman-nsec)" \
    cypher-mcp/.venv/bin/python cypher-mcp/scripts/explore_factory_write.py

Then SEE it in Neo4j Browser (you hold the AuraDB creds):
    MATCH (s:Service)<-[:FILED_AGAINST]-(i:Issue) RETURN s, i
"""

from __future__ import annotations

import asyncio
import getpass
import os
import sys
from pathlib import Path

# Use the local tollbooth-dpyc source (has agent_keyring / patron_signer, 0.63.1+) ahead of
# whatever the cypher-mcp venv pins, so this runs without upgrading or disturbing the venv.
_root = Path(__file__).resolve().parents[2]
_sdk_src = _root / "tollbooth-dpyc" / "src"
if _sdk_src.is_dir():
    sys.path.insert(0, str(_sdk_src))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

UPSTREAM = os.environ.get("CYPHER_MCP_URL", "https://cypher-mcp.fastmcp.app/mcp")


async def _run(npub: str, nsec: str) -> int:
    from fastmcp import Client
    from tollbooth.agent_keyring import build_keyring

    keyring = build_keyring(UPSTREAM, npub, nsec)  # the agent's signing hand
    async with Client(keyring) as client:
        print(f"Journeyman {npub[:16]}… recording a triage through the keyring…\n")
        res = await client.call_tool(
            "cypher_record_triage",
            {
                "repo_name": "tollbooth-sample",
                "issue_number": 999,
                "title": "Exploration: the Journeyman's first graph write",
                "classification": "chore",
                "disposition": "agent/fix",
            },
        )
        data = res.data if hasattr(res, "data") else res
        print("cypher_record_triage →", data)
        ok = isinstance(data, dict) and data.get("success")
        print(
            "\n✅ A real Issue+Service node is now in your graph — paid with your sats, no LLM."
            if ok else
            "\n⚠️  Not a success response — read the error above. (unpriced? unfunded? proof?)"
        )
        print("See it:  MATCH (s:Service)<-[:FILED_AGAINST]-(i:Issue) RETURN s, i")
    return 0


def main() -> int:
    npub = os.environ.get("JOURNEYMAN_NPUB", "").strip() or input("Journeyman npub: ").strip()
    nsec = os.environ.get("JOURNEYMAN_NSEC", "").strip()
    if not nsec:
        nsec = getpass.getpass("Journeyman nsec (hidden): ").strip()
    if not (npub and nsec):
        print("need both a Journeyman npub and nsec", file=sys.stderr)
        return 2
    return asyncio.run(_run(npub, nsec))


if __name__ == "__main__":
    raise SystemExit(main())
