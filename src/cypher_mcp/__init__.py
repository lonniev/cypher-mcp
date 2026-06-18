"""cypher-mcp — monetized graph answers over Cypher, on Tollbooth DPYC.

A conventional Tollbooth-DPYC Operator that sells *priced graph answers* —
operator-authored, parameterized, named Cypher query templates — rather than
raw database access. The Bolt/Cypher store is sealed behind the tool handlers;
the Tollbooth/Neon/Nostr settlement plane never knows a graph exists.
"""

from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as _pkg_version

try:
    __version__ = _pkg_version("cypher-mcp")
except PackageNotFoundError:  # not installed (e.g. source checkout without build)
    __version__ = "0.0.0"

