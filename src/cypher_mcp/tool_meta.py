"""Title and behaviour of a published (named) query tool, read from its catalog row.

A published query becomes a tool at runtime, so its MCP title and behaviour hints
come from the row itself: the key gives the title, and the access mode plus the
Cypher template give the behaviour. A ``read`` query runs in a Neo4j read session
and so only reads; a ``write`` query is judged by the clauses its template uses.
"""

from __future__ import annotations

import re
from typing import Any

from tollbooth.tool_identity import (
    CREATES_REMOTE,
    DELETES_REMOTE,
    READS_REMOTE,
    REPLACES_REMOTE,
    WRITES_REMOTE,
    ToolBehavior,
)

# Overwrites what was there and adds something new on every call.
REPLACES_AND_APPENDS_REMOTE = ToolBehavior(
    read_only=False, destructive=True, idempotent=False, open_world=True
)

# Words a humanised key spells in capitals.
_ACRONYMS = {"pr": "PR", "prs": "PRs", "id": "ID", "url": "URL", "npub": "npub"}

_STRING_LITERAL = re.compile(r"'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"")
_REMOVES = re.compile(r"\b(?:DELETE|REMOVE)\b", re.IGNORECASE)
_SET = re.compile(r"\bSET\b", re.IGNORECASE)
_ON_CREATE_BEFORE = re.compile(r"\bON\s+CREATE\s*$", re.IGNORECASE)
_CREATE = re.compile(r"\bCREATE\b", re.IGNORECASE)
_ON_BEFORE = re.compile(r"\bON\s*$", re.IGNORECASE)
_CLOCK_ALIAS = re.compile(
    r"\b(?:timestamp|datetime|localdatetime)\(\)\s+AS\s+(\w+)", re.IGNORECASE
)
_MERGE_MAP = re.compile(r"\bMERGE\s*\([^)]*?\{([^}]*)\}", re.IGNORECASE)
_FRESH_VALUE = re.compile(
    r"\b(?:timestamp|datetime|localdatetime|randomUUID|rand)\(\)", re.IGNORECASE
)


def title_for_key(key: str) -> str:
    """Display title for a published query: its key in plain words, sentence case.

    Args:
        key: The catalog key, ``^[a-z][a-z0-9_]*$`` (e.g. ``upsert_capability``).
    """
    words = [_ACRONYMS.get(w, w) for w in key.split("_") if w]
    if not words:
        return key
    first = words[0]
    if first == first.lower():
        first = first.capitalize()
    return " ".join([first, *words[1:]])


def _sets_existing_properties(cypher: str) -> bool:
    """True when the template has a SET that runs on an existing node or edge.

    ``ON CREATE SET`` only stamps a node being born; every other SET (plain,
    ``ON MATCH``, inside ``FOREACH``) overwrites what an earlier call wrote.
    """
    return any(
        not _ON_CREATE_BEFORE.search(cypher[: m.start()]) for m in _SET.finditer(cypher)
    )


def _creates_fresh_nodes(cypher: str) -> bool:
    """True when each call adds a node or edge an earlier identical call did not.

    A bare ``CREATE`` always does. So does a ``MERGE`` whose identity map holds a
    clock or random value, directly or through a ``WITH timestamp() AS x`` alias.
    """
    if any(not _ON_BEFORE.search(cypher[: m.start()]) for m in _CREATE.finditer(cypher)):
        return True
    aliases = {a.lower() for a in _CLOCK_ALIAS.findall(cypher)}
    for identity in _MERGE_MAP.findall(cypher):
        if _FRESH_VALUE.search(identity):
            return True
        if aliases & {w.lower() for w in re.findall(r"\w+", identity)}:
            return True
    return False


def behavior_for_query(row: dict[str, Any]) -> ToolBehavior:
    """What running a catalog query does, judged from its access mode and template.

    Every query reaches the operator's Neo4j store, so every result is open world.

    Args:
        row: A ``query_catalog`` row; reads ``access_mode`` (``read`` or
            ``write``) and ``cypher_template``.
    """
    if (row.get("access_mode") or "read") == "read":
        return READS_REMOTE
    cypher = _STRING_LITERAL.sub("''", row.get("cypher_template") or "")
    removes = bool(_REMOVES.search(cypher))
    destructive = removes or _sets_existing_properties(cypher)
    idempotent = not _creates_fresh_nodes(cypher)
    if destructive and idempotent:
        return DELETES_REMOTE if removes else REPLACES_REMOTE
    if destructive:
        return REPLACES_AND_APPENDS_REMOTE
    return WRITES_REMOTE if idempotent else CREATES_REMOTE
