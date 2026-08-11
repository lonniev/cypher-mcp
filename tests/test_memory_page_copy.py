"""Memory page copy must lead with purpose, not machinery (#78).

A stranger who has never heard of the factory should finish /memory able to
state what the intention graph stores and why that is valuable. Mechanisms
(ResolvedVia, llm-inferred-unverified, tool names) arrive only after the
difficulty they address has been made concrete.

This is a content contract over the FE source strings — there is no frontend
test runner in this repo, and the defect is purely copy.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MEMORY_PAGE = (ROOT / "frontend/src/components/public/MemoryPage.tsx").read_text()
FACTORY_MODEL = (ROOT / "frontend/src/lib/factoryModel.ts").read_text()
SURFACE = MEMORY_PAGE + "\n" + FACTORY_MODEL


def _header(text: str = MEMORY_PAGE) -> str:
    end = text.find("</header>")
    assert end >= 0, "Memory page has no </header>"
    return text[:end]


def _section_body(heading: str, text: str = MEMORY_PAGE) -> str:
    """Prose from a heading through the next <h2 or end of file."""
    idx = text.find(heading)
    assert idx >= 0, f"missing heading {heading!r}"
    rest = text[idx:]
    # skip this heading line, stop at the next h2 if any
    after = rest.find("\n")
    body = rest[after + 1 :] if after >= 0 else rest
    next_h2 = body.find("<h2")
    return body if next_h2 < 0 else body[:next_h2]


class TestMemoryPageLeadsWithPurpose:
    def test_lede_names_the_forgetting_problem(self):
        # Acceptance 1: a stranger can state what is stored and why it is valuable.
        lede = _header().lower()
        asserts_purpose = any(
            phrase in lede
            for phrase in (
                "do not remember",
                "doesn't remember",
                "does not remember",
                "begin blind",
                "begins blind",
                "re-derive",
                "re-deriving",
                "forget",
            )
        )
        asserts_why = any(
            phrase in lede
            for phrase in (
                "understanding is kept",
                "knowledge graph",
                "where the factory remembers",
                "intention graph",
            )
        )
        assert asserts_purpose, (
            "Memory page lede never states the forgetting / re-deriving problem "
            "a first-time reader needs before the machinery makes sense"
        )
        assert asserts_why, "Memory page lede never says what the graph is for"

    def test_no_this_operator_chrome_in_heading(self):
        # Acceptance 3: no undefined internal vocabulary in headings / leading text.
        header = _header()
        assert "This operator" not in header
        assert "this operator" not in header.lower()

    def test_resolved_via_is_preceded_by_the_cost_of_search(self):
        # Acceptance 2: mechanism after difficulty.
        assert "whole argument in three values" not in SURFACE
        # Must not open the page's resolution story with the enum name alone.
        assert "ResolvedVia" not in MEMORY_PAGE
        section = _section_body("How the code was found")
        lowered = section.lower()
        assert any(
            p in lowered
            for p in (
                "locating the code",
                "first job is locating",
                "expensive part",
                "search is the expensive",
            )
        ), "ResolvedVia section never makes the cost of search concrete first"
        # The three values still appear in the shared model the section renders.
        assert 'key: "graph"' in FACTORY_MODEL
        assert 'key: "scoped-grep"' in FACTORY_MODEL
        assert 'key: "wide-grep"' in FACTORY_MODEL
        assert "RESOLVED_VIA" in MEMORY_PAGE

    def test_authority_section_establishes_the_hazard_before_the_literal(self):
        # Hazard (confident guess recorded as fact) before any Cypher-literal mechanism.
        cold = (
            "llm-inferred-unverified is a Cypher literal inside the write template, "
            "not a parameter. There is no argument an agent can pass to claim human "
            "authority. The agent proposes; the human legislates."
        )
        assert cold not in SURFACE, (
            "provenance still opens cold with the Cypher-literal mechanism "
            "instead of the hazard it defends against"
        )
        assert "Plausible is not the same as correct" in SURFACE or "confident guess" in SURFACE
        assert "Agents may propose" in SURFACE or "Only humans authorize" in SURFACE
        assert "human legislates" in SURFACE.lower()

    def test_epigrams_are_kept(self):
        # Issue asked to keep the good lines once earned.
        assert "human legislates" in SURFACE.lower()
        assert "wide-grep" in SURFACE
