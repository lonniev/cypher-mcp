"""cypher-mcp — monetized graph answers over Cypher, on Tollbooth DPYC.

A conventional Tollbooth-DPYC Operator that sells *priced graph answers* —
operator-authored, parameterized, named Cypher query templates — rather than
raw database access. The Bolt/Cypher store is sealed behind the tool handlers;
the Tollbooth/Neon/Nostr settlement plane never knows a graph exists.
"""

__version__ = "0.1.0"
