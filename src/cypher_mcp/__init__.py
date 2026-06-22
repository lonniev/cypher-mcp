"""cypher-mcp — monetized graph answers over Cypher, on Tollbooth DPYC.

A conventional Tollbooth-DPYC Operator that sells *priced graph answers* —
operator-authored, parameterized, named Cypher query templates — rather than
raw database access. The Bolt/Cypher store is sealed behind the tool handlers;
the Tollbooth/Neon/Nostr settlement plane never knows a graph exists.
"""

from tollbooth.version import resolve_service_version

__version__ = resolve_service_version("cypher-mcp", __file__)

