# Cypher Lab Notebook — frontend

A read-only architect's dashboard over the cypher-mcp **intention graph** (the
DPYC Agentic Service Desk). It presents the graph as a bound lab notebook —
table of contents, cross-referenced registers, a keyword concordance, and a
metrics ledger — deliberately **not** a force-directed bubble map.

Scaffolding and the whole npub-proof auth stack are cloned from
`excalibur-mcp/frontend` (the DPYC house pattern); only the slug, the
localStorage key prefixes, the proxy upstream, and the domain views differ.

## Stack

Vite + React 19 + TypeScript + Tailwind (dark by default) + react-router-dom.
Nostr via `nostr-tools`; MCP via `@modelcontextprotocol/sdk` over
StreamableHTTP. Deployed as a Cloudflare Pages SPA; `functions/mcp.js` proxies
same-origin `/mcp` → `https://cypher-mcp.fastmcp.app/mcp`.

## Authentication

Identity is a Nostr npub. Two interchangeable tactics, transparent to callers
(`src/lib/mcp.ts`, `inlineProof.ts`, `sessionNsec.ts`, `NpubGate.tsx`):

- **nsec in browser** — a session key signs a fresh kind-27235 inline proof per
  metered call, scoped to the runtime tool name. The nsec never leaves the tab.
- **npub + DM login** — a Secure Courier challenge DM; the replay `dpop_token`
  is cached and sent verbatim. Returning users skip the DM.

The nsec is never sent to the backend. A lapsed proof bounces the user back to
sign-in with a calm re-auth notice.

## Two data tiers (why the UI is cache-first)

| Tier | Tools | Cost | Where |
|---|---|---|---|
| **Operational** (free) | `service_status`, `session_status`, `get_pricing_model`, `check_balance` | free | Front Matter masthead, Query Catalog |
| **Intention graph** (metered) | `list_capabilities`, `context_pack`, `explain_capability`, `what_realizes_capability`, `symbols_in_service`, `capability_patents`, `explain_patent_element`, `which_service_handles`, `factory_resolution_stats` | debits sats / call (refunded on error) | every graph register |

Graph reads are published dynamic tools that cost sats. The graph is small and
changes slowly, so every metered read is **cache-first** (`src/lib/graphCache.ts`):
cached answers render instantly and free, stamped with their age; a visible
**Refresh** affordance previews the price (via the free `check_price`) before
spending. Nothing polls; nothing auto-refreshes on a timer.

## Sections

- **Contents** — Front Matter colophon (lifecycle light, vault/courier health,
  versions, tool counts) over the table of contents.
- **Capabilities** — the central register + keyword index; each leaf shows the
  rationale (with its provenance seal), owners/consumers, realizing symbols, and
  patent grounding.
- **Concordance** — keyword → which services handle it + full context packs.
- **Metrics** — the `resolved_via` token-savings ledger (graph vs. grep).
- **Query Catalog** — the published tool set and prices (free read).
- **Service / Patent leaves** — reached by cross-reference from any capability.

**Provenance is honest throughout:** `human-authored` rationale is doctrine (an
agent cannot forge it); `llm-inferred-unverified` is advice awaiting review. The
two are marked unmistakably apart on every entry.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173  (proxied /mcp needs `wrangler pages dev` or a deploy)
npm run build    # tsc -b && vite build → dist/
```

`VITE_MCP_URL=/mcp` (see `.env`). Locally, run behind `wrangler pages dev` so
the `functions/mcp.js` proxy resolves, or point `VITE_MCP_URL` at the upstream.
