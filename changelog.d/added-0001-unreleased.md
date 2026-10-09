Vocabulary and properties for retrospective audit answers — not a schema rewrite,
no RDF serializer, no rdflib. Seed with `scripts/seed_factory_vocabulary.py`.

- **Assertion props** on Decision / Assertion / Invariant: `role`, `confidence`,
  `provenance_status` (`suggested` | `asserted` | `authorized` | `superseded`),
  `generated_at_time`, plus `attributed_to` when known. Makes the Porter/Journeyman
  split queryable (roles map onto prov:Role).
- **Effectivity** (`valid_from` / `valid_to`) on Capability, Invariant, Decision,
  and Assertion — valid time alongside `recent_activity`'s transaction time.
- **Severity** on Invariant: `Violation` | `Warning` | `Info` (SHACL-ish); default
  `Violation` preserves today's equal-enforceability semantics.
- **CONTRADICTS** and **SUPERSEDES** relationship types. `authorize_capability_why`
  no longer silently overwrites the Journeyman's suggested why — it mints a
  versioned `:Assertion`, SUPERSEDES prior authorized claims, and CONTRADICTS open
  suggestions. Both sides stay queryable. `mark_invariant_contradiction` records
  incompatible invariants the same way. `retire_funding_block` keeps the keep-not-delete
  discipline and stamps `provenance_status='superseded'`.
- **Six audit reads** (one question each, shared envelope):
  `audit_why_exists`, `audit_who_authorized`, `audit_what_derived_from`,
  `audit_what_guards`, `audit_what_contradicts`, `audit_what_changed_since`.
  Envelope: `{subject, question, assertions, contradictions, gaps}` with PROV term
  strings as badges. The `gaps` array is an honest work queue.
- **FE Audit page** (`/audit`) — capability picker, as-of date (valid time), the six
  questions, contradictions banner above the answer, confidence bands, effectivity
  lines, and gaps.
