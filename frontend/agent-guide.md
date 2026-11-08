Cypher is a web app at https://cypher.tollbooth-dpyc.com and an MCP server that AI assistants can call.
It sells answers from a graph: operator-authored, parameterized, named Cypher queries.
A patron supplies the parameters, and the operator owns the query.
There is no raw database access.

The graph it serves is the intention graph of the DPYC Agentic Software Factory.
It records why each capability of the Tollbooth DPYC network exists, which service realizes it, and where the patent describes it.
Agents do not remember between sessions, so the graph is where what one agent learned waits for the next.

## What is on this site

- **Home** — the factory in one page, with live figures from the intention graph.
- **Factory** (`/factory`) — the crew of judgement and policy roles, how an issue and a PR move through it, and its two funding rails.
- **Memory** (`/memory`) — what the intention graph stores, and why.
- **Join** (`/join`) — bring a Nostr npub, prove you control it, and use the operator.
- **Lab Notebook** (`/notebook`) — signed-in views of capabilities, issues, recent activity and your wallet.

## Tools

- `cypher_execute_query_by_key(key, params)` runs a published query; `cypher_list_queries` and `cypher_get_query` show the catalog.
- Some queries are published as named tools of their own:
  - `cypher_which_service_handles(keyword)` — which service on the network handles a concern.
  - `cypher_explain_capability(name)` — why a capability exists, in the words of the person who authorized it.
  - `cypher_capability_patents(name)` — where the patent describes a capability.
  - `cypher_list_capabilities`, `cypher_recent_activity` and `cypher_public_factory_stats`.
- Each capability carries a provenance label: `human-authored` is doctrine, and `llm-inferred-unverified` is an agent's advice.
