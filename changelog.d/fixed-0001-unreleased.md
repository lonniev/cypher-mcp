Four of the six `audit_*` reads already took `as_at_ms` (default 0 = now). The other two —
`audit_what_derived_from` and `audit_what_contradicts` — omitted it from both the param schema
and the Cypher, so callers who had just successfully passed `as_at_ms` to a sibling got a raw
Pydantic `unexpected_keyword_argument` (and the same rejection via `execute_query_by_key`).
Those are exactly the questions whose answers change as assertions supersede one another.

Both now declare `as_at_ms` with the same default/semantics and filter assertion (and, for
contradicts, invariant) `valid_from`/`valid_to` the way their siblings do. `audit_what_changed_since`
keeps its deliberate `since_ms` window parameter. Re-seed the factory vocabulary to publish the
updated templates.
