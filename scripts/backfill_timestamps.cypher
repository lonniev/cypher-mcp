// One-shot timestamp backfill for the Recently Changed register (recent_activity).
//
// WHY: recent_activity filters `updated_at IS NOT NULL`, so a node only appears
// once a write stamped it. Four node kinds already stamp at population time
// (Capability.updated_at, Issue.triaged_at, Service.created_at, Invariant.at),
// but two did NOT until the vocabulary gained timestamps:
//   - Symbol       — index_symbol previously set no timestamp; only *anchored*
//                    symbols carried anchored_at.
//   - PatentElement — upsert_patent_element previously set no timestamp.
// Every existing node was populated within the last ~3 days, so stamping the
// un-dated ones with the migration moment (timestamp()) is truthful to within
// that window — which is finer than the feed's coarsest chiclet (Last 30 days).
// New nodes are stamped honestly going forward by the updated write templates.
//
// GitHub dates are deliberately NOT used: Symbols/PatentElements aren't issues,
// and for Issues the KB's own triaged_at (when the factory learned it) is the
// correct "recently changed in the knowledge base" timeline — a GitHub
// created_at (possibly months old) would misdate it.
//
// HOW TO RUN (operator, once): paste into the Neo4j/AuraDB Browser or
//   cat scripts/backfill_timestamps.cypher | cypher-shell -a <bolt-uri> -u <user> -p <pw>
// Idempotent: each statement only touches nodes still missing their field, so
// re-running is a safe no-op.

// --- The actual gap ---------------------------------------------------------
MATCH (s:Symbol)
WHERE s.anchored_at IS NULL AND s.indexed_at IS NULL AND s.updated_at IS NULL
SET s.indexed_at = timestamp();

MATCH (p:PatentElement)
WHERE p.updated_at IS NULL
SET p.updated_at = timestamp();

// --- Belt-and-suspenders: any node created via a path that skipped its stamp -
// (No-ops if the four already-dated kinds are fully covered, which they should
//  be — included so a single run guarantees the whole graph is time-queryable.)
MATCH (c:Capability)
WHERE coalesce(c.updated_at, c.authored_at, c.inferred_at) IS NULL
SET c.updated_at = timestamp();

MATCH (i:Issue)
WHERE coalesce(i.scoped_at, i.triaged_at) IS NULL
SET i.triaged_at = timestamp();

MATCH (sv:Service)
WHERE sv.created_at IS NULL
SET sv.created_at = timestamp();

MATCH (inv:Invariant)
WHERE inv.at IS NULL
SET inv.at = timestamp();


// ===========================================================================
// SINGLE-STATEMENT VARIANT — for the MCP operator path (create_query →
// execute_query_by_key → delete_query). run_named() executes ONE statement per
// call, so the ;-split form above can't ride execute_query_by_key; this folds
// the same backfill into one statement using unit CALL {} write-subqueries.
// No params. access_mode="write".
// ===========================================================================
// CALL { MATCH (s:Symbol) WHERE s.anchored_at IS NULL AND s.indexed_at IS NULL AND s.updated_at IS NULL SET s.indexed_at = timestamp() }
// CALL { MATCH (p:PatentElement) WHERE p.updated_at IS NULL SET p.updated_at = timestamp() }
// CALL { MATCH (c:Capability) WHERE coalesce(c.updated_at, c.authored_at, c.inferred_at) IS NULL SET c.updated_at = timestamp() }
// CALL { MATCH (i:Issue) WHERE coalesce(i.scoped_at, i.triaged_at) IS NULL SET i.triaged_at = timestamp() }
// CALL { MATCH (sv:Service) WHERE sv.created_at IS NULL SET sv.created_at = timestamp() }
// CALL { MATCH (inv:Invariant) WHERE inv.at IS NULL SET inv.at = timestamp() }
// RETURN 'backfilled' AS status
