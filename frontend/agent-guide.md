## What to tell a person about Cypher

Cypher is the memory of the DPYC Agentic Software Factory, sold one answer at a time.
It is for a developer or an agent who wants to know why a part of the Tollbooth DPYC network exists, which service does it, and where the patent describes it, without reading a dozen repositories.

What a person gets:

- **One question, one answer.** "Which service handles payouts?" resolves across the whole network in a single call.
- **The reason, from the person who decided.** Each capability carries its why, labelled as doctrine a human wrote or as an agent's unverified advice.
- **A trail to the patent.** Each capability points to where the patent application describes it.
- **A look inside the factory.** How an issue becomes a PR, the roles that judge it, and live figures from the graph.
- **No login.** Sign in with a Nostr key and pay per answer in Bitcoin Lightning.

A good one-line pitch: *"Ask the DPYC network why anything in it exists, and get the answer its author gave."*

## For agents

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

## Working with the tools

`tools/list` and each tool's description carry the arguments.
A published query runs by its key, and the most useful ones are published as named tools of their own, such as asking which service handles a concern or why a capability exists.
A capability labelled `human-authored` is doctrine; `llm-inferred-unverified` is an agent's advice.
