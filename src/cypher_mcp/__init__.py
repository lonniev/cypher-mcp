"""cypher-mcp — monetized graph answers over Cypher, on Tollbooth DPYC.

A conventional Tollbooth-DPYC Operator that sells *priced graph answers* —
operator-authored, parameterized, named Cypher query templates — rather than
raw database access. The Bolt/Cypher store is sealed behind the tool handlers;
the Tollbooth/Neon/Nostr settlement plane never knows a graph exists.
"""

from importlib.metadata import PackageNotFoundError, version as _pkg_version


def _resolve_version() -> str:
    """Single source of truth: pyproject [project].version. Installed metadata
    first, with a from-source pyproject.toml fallback for deploys that run the
    checkout without installing it."""
    try:
        return _pkg_version("cypher-mcp")
    except PackageNotFoundError:
        pass
    try:
        import tomllib
        from pathlib import Path
        for parent in Path(__file__).resolve().parents:
            pp = parent / "pyproject.toml"
            if pp.is_file():
                with pp.open("rb") as fh:
                    return tomllib.load(fh)["project"]["version"]
    except Exception:
        pass
    return "0.0.0"


__version__ = _resolve_version()

