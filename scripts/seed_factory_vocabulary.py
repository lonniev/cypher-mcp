#!/usr/bin/env python3
"""Seed the DPYC Software Factory intent vocabulary into a live cypher-mcp operator.

Idempotent, operator-run. For each template in :mod:`factory_vocabulary` (writes then
the Task-2 read surface):
  1. ``create_query`` it (with the template's ``access_mode``),
  2. ``publish_tool`` it (so agents get a typed ``cypher_<key>`` tool).

By default it stops there — the published tools are **unlimited** (any funded patron may
call them once priced). Pricing and per-npub limiting are a Pricing Studio activity:
price the tools, and — when ready — add a ``json_expression`` allow-list on ``patron.npub``
to restrict each *write* to its role npubs (Porter/Journeyman/Harvester; Constraint-Engine
access control, no bespoke ACL). Reads stay open. ``--dry-run`` prints that exact
allow-list so you can replicate it in Pricing Studio, and ``--gate`` applies it
programmatically via ``set_pricing_model`` if you prefer.

Nothing here writes an nsec anywhere: the operator nsec is used transiently to sign
one-shot kind-27235 proofs and is never logged or persisted.

Usage:
    # preview everything without calling the server or needing an nsec:
    python scripts/seed_factory_vocabulary.py --dry-run \
        --porter-npub npub1ymg... --journeyman-npub npub1m5q...

    # apply against the live operator (reads OPERATOR_NSEC from env, or prompts hidden):
    python scripts/seed_factory_vocabulary.py \
        --url https://cypher-mcp.fastmcp.app/mcp \
        --operator-npub npub1fuhq0... \
        --porter-npub npub1ymg... --journeyman-npub npub1m5q...
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from factory_vocabulary import (  # noqa: E402
    VOCABULARY, READ_VOCABULARY, PORTER, JOURNEYMAN, OPERATOR,
)

# Everything that gets authored + published (writes then reads). Gating (below) applies
# only to the writes; reads stay open (priced, unrestricted).
ALL_TEMPLATES = [*VOCABULARY, *READ_VOCABULARY]

SLUG = "cypher"


# --------------------------------------------------------------------------- #
# Pure builders (unit-tested; no I/O)
# --------------------------------------------------------------------------- #

def resolve_roles(roles: tuple[str, ...], npubs: dict[str, str]) -> list[str]:
    """Map role tokens (porter/journeyman) to concrete npubs, order-stable, deduped."""
    out: list[str] = []
    for r in roles:
        npub = npubs.get(r)
        if npub and npub not in out:
            out.append(npub)
    return out


def build_gate_step(allowed_npubs: list[str]) -> dict[str, Any]:
    """A json_expression allow-list PipelineStep: listed npub allowed, all others denied.

    IMPORTANT: no ``patron_npubs`` on the step — that field would *skip* the step for
    non-listed callers (letting them through). The expression's default-deny does the
    gating (on_match='allow' returns allowed=False when the expression is false).
    """
    return {
        "id": "factory-allowlist",
        "type": "json_expression",
        "params": {
            "on_match": "allow",
            "expression": {"field": "patron.npub", "op": "in", "value": allowed_npubs},
            "deny_reason": "not_authorized",
            "deny_message": "This factory tool is restricted to specific agent npubs.",
        },
    }


def apply_gate_and_price(model: dict[str, Any], npubs: dict[str, str]) -> dict[str, Any]:
    """Return a copy of *model* with each vocabulary tool priced + gated to its roles.

    Matches published tools by tool_name == f'{SLUG}_{key}'. Tools not yet present
    (publish step hasn't run) are reported to stderr and skipped.
    """
    by_key = {f"{SLUG}_{t.key}": t for t in ALL_TEMPLATES}
    tools = model.get("tools", [])
    seen: set[str] = set()
    for tp in tools:
        name = tp.get("tool_name", "")
        vt = by_key.get(name)
        if not vt:
            continue
        seen.add(name)
        tp["price_sats"] = vt.price_sats
        tp["priced"] = True
        tp["price_type"] = "flat"
        allowed = resolve_roles(vt.allow_roles, npubs)
        tp["chain"] = [build_gate_step(allowed)] if allowed else []
    for name in by_key:
        if name not in seen:
            print(f"  ! {name} not in pricing model yet (publish it first)", file=sys.stderr)
    return model


# --------------------------------------------------------------------------- #
# Driver (live)
# --------------------------------------------------------------------------- #

async def _apply(url: str, operator_npub: str, operator_nsec: str,
                 npubs: dict[str, str], gate: bool, price: bool = False) -> int:
    from fastmcp import Client
    from tollbooth.identity_proof import create_proof

    def proof(capability: str) -> str:
        return create_proof(operator_nsec, f"{SLUG}_{capability}")

    async with Client(url) as client:
        async def call(capability: str, args: dict[str, Any]) -> dict[str, Any]:
            # create_proof timestamps at whole-second resolution with a fixed body, so two
            # calls signing for the same tool in the same second mint an identical Nostr
            # event (same id) and the server's replay guard rejects the second as seen.
            # Re-sign after the second ticks over — a fresh timestamp gives a fresh id.
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

        # 1 + 2: author and publish each write template (idempotent). The published
        # tools appear in Pricing Studio unpriced — price them there. Starting
        # unpriced/ungated is deliberate: unlimited access to any funded patron until
        # the operator chooses to price and (later) restrict.
        for t in ALL_TEMPLATES:
            r = await call("create_query", {
                "key": t.key, "cypher_template": t.cypher,
                "param_schema": t.param_schema, "description": t.description,
                "access_mode": t.access_mode,
            })
            print(f"  create_query {t.key} ({t.access_mode}): {r.get('message') or r.get('error') or r}")
            r = await call("publish_tool", {"key": t.key, "tool_intent": t.intent})
            print(f"  publish_tool {t.key}: {r.get('message') or r.get('error') or r}")

        # 3 (opt-in): price and/or gate via the pricing model.
        #   --price : price every tool at its vocab price, NO allow-list (stays tolerant).
        #   --gate  : price AND restrict each write to its role npubs (reads stay open).
        # Default is neither — start unpriced/ungated and do it in Pricing Studio.
        if gate or price:
            model_res = await call("get_pricing_model", {})
            model = model_res.get("pricing_model") or model_res.get("model") or model_res
            # npubs drive the allow-list; empty (price-only) => empty chain => ungated.
            model = apply_gate_and_price(model, npubs if gate else {})
            r = await call("set_pricing_model", {"model_json": json.dumps(model)})
            label = f"gated to {list(npubs.values())}" if gate else "priced, ungated"
            print(f"  set_pricing_model ({label}): "
                  f"{r.get('message') or r.get('error') or r}")
        else:
            print("  (no pricing/gating applied — tools stay unpriced/ungated; price them "
                  "in Pricing Studio, add the per-npub allow-list there when ready)")
    return 0


def _dry_run(npubs: dict[str, str]) -> int:
    print("# create_query / publish_tool payloads (applied by default).")
    print("# 'gate' below is the per-npub allow-list to apply LATER — in a Pricing Studio")
    print("# session, or with --gate — to limit writes to the agent/harvester npubs.")
    print("# Reads have no gate (open, priced). Default = unlimited.\n")
    for t in ALL_TEMPLATES:
        allowed = resolve_roles(t.allow_roles, npubs)
        gate = "(open read)" if t.access_mode == "read" else (
            allowed or "[set npubs to see the gate]")
        print(f"## {t.key}  (limit-to: {gate})")
        print(f"   access_mode={t.access_mode}  suggested price={t.price_sats}")
        print(f"   cypher: {t.cypher}")
        print(f"   params: {json.dumps(t.param_schema)}")
        if t.access_mode == "write":
            print(f"   gate:   {json.dumps(build_gate_step(allowed))}\n")
        else:
            print()
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Seed the DPYC factory mutation vocabulary.")
    ap.add_argument("--url", default=os.environ.get("CYPHER_MCP_URL", "https://cypher-mcp.fastmcp.app/mcp"))
    ap.add_argument("--operator-npub", default=os.environ.get("OPERATOR_NPUB", ""))
    ap.add_argument("--porter-npub", default=os.environ.get("PORTER_NPUB", ""))
    ap.add_argument("--journeyman-npub", default=os.environ.get("JOURNEYMAN_NPUB", ""))
    ap.add_argument("--dry-run", action="store_true", help="print payloads; no network, no nsec")
    ap.add_argument("--price", action="store_true",
                    help="price every tool at its vocab price with NO allow-list "
                         "(stays tolerant/ungated) — makes the tools callable for testing.")
    ap.add_argument("--gate", action="store_true",
                    help="price AND apply the per-npub allow-list via set_pricing_model "
                         "(default: leave unpriced; gate later in Pricing Studio). Requires npubs.")
    args = ap.parse_args()

    npubs = {
        PORTER: args.porter_npub,
        JOURNEYMAN: args.journeyman_npub,
        OPERATOR: args.operator_npub,  # the human-run operator writes the authoritative why
    }
    if args.dry_run:
        return _dry_run(npubs)

    if not args.operator_npub:
        print("--operator-npub (or OPERATOR_NPUB) is required to apply", file=sys.stderr)
        return 2
    if args.gate and not (npubs[PORTER] and npubs[JOURNEYMAN] and npubs[OPERATOR]):
        print("--gate requires --porter-npub, --journeyman-npub, and --operator-npub",
              file=sys.stderr)
        return 2
    operator_nsec = os.environ.get("OPERATOR_NSEC", "")
    if not operator_nsec:
        import getpass
        operator_nsec = getpass.getpass("Operator nsec (hidden): ")
    if not operator_nsec:
        print("no operator nsec provided", file=sys.stderr)
        return 2

    return asyncio.run(
        _apply(args.url, args.operator_npub, operator_nsec, npubs, args.gate, args.price)
    )


if __name__ == "__main__":
    raise SystemExit(main())
