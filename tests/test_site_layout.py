"""Site-wide FE layout contracts (#80, #82, #86).

1. Content columns use a literal 80vw from tablet up — no ch/px ceiling (#82
   supersedes the ~110ch cap from #80). Phones stay full width.
2. Primary nav (Home · Factory · Memory · Join · Lab Notebook) is defined once
   and present on both public and notebook chrome — notebook secondary items
   must not replace it.
3. Prose (headings, ledes, paragraphs) inherits the page-frame width — no
   nested max-w-xl / max-w-2xl / max-w-3xl ceilings that leave text at ~50%
   while cards span 80vw (#86).

No frontend test runner in this repo; these are source contracts over the FE.
"""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
FE = ROOT / "frontend/src"

PUBLIC_SHELL = (FE / "components/public/PublicShell.tsx").read_text()
NAV = (FE / "components/Nav.tsx").read_text()
APP = (FE / "App.tsx").read_text()
INDEX_CSS = (FE / "index.css").read_text()
UI = (FE / "components/notebook/ui.tsx").read_text()
DOSSIER = (FE / "components/notebook/dossier.tsx").read_text()
HOME = (FE / "components/public/HomePage.tsx").read_text()
FACTORY = (FE / "components/public/FactoryPage.tsx").read_text()
MEMORY = (FE / "components/public/MemoryPage.tsx").read_text()
JOIN = (FE / "components/public/JoinPage.tsx").read_text()
HERO = (FE / "components/Hero.tsx").read_text()

PRIMARY_LABELS = ("Home", "Factory", "Memory", "Join", "Lab Notebook")
PAGE_FRAMES = {
    "HomePage": HOME,
    "FactoryPage": FACTORY,
    "MemoryPage": MEMORY,
    "JoinPage": JOIN,
    "notebook/ui Page": UI,
    "dossier": DOSSIER,
}
# Page surfaces whose prose must share the page-frame edges with card grids (#86).
PROSE_SURFACES = {
    "HomePage": HOME,
    "FactoryPage": FACTORY,
    "MemoryPage": MEMORY,
    "JoinPage": JOIN,
    "Hero": HERO,
    "App NotebookGate": APP,
    "notebook/ui Page": UI,
}
# Nested typographic ceilings that pin text narrower than page-frame.
PROSE_MAX_W = re.compile(r"\bmax-w-(?:xl|2xl|3xl)\b")


class TestContentColumnWidth:
    def test_shared_page_frame_utility_exists(self):
        # Single site-wide measure: literal 80vw, no character/pixel ceiling (#82).
        assert "page-frame" in INDEX_CSS or "page-frame" in PUBLIC_SHELL
        surface = INDEX_CSS + "\n" + PUBLIC_SHELL
        assert "80vw" in surface
        assert "110ch" not in surface
        assert "min(80vw" not in surface
        # The tablet+ rule must set max-width to bare 80vw.
        assert "max-width: 80vw" in INDEX_CSS

    def test_page_frames_use_shared_measure_not_fixed_5xl(self):
        # Outer page shells must not pin to Tailwind's fixed max-w-5xl/4xl alone.
        for name, src in PAGE_FRAMES.items():
            assert "max-w-5xl" not in src, f"{name} still uses fixed max-w-5xl"
            # dossier used max-w-4xl; notebook Page used max-w-5xl
            if name == "dossier":
                assert "max-w-4xl" not in src, "dossier still uses fixed max-w-4xl"
            assert "page-frame" in src, f"{name} does not use the shared page-frame class"

    def test_prose_inherits_page_frame_no_nested_max_w(self):
        # #86: cards already span page-frame; prose must not keep a separate
        # max-w-xl/2xl/3xl ceiling that leaves headings/ledes at ~50% width.
        for name, src in PROSE_SURFACES.items():
            hits = PROSE_MAX_W.findall(src)
            assert not hits, (
                f"{name} still constrains prose with {hits!r}; "
                "remove nested max-w-xl/2xl/3xl so text shares page-frame edges"
            )


class TestPrimaryNavEverywhere:
    def test_primary_nav_lists_all_site_items(self):
        for label in PRIMARY_LABELS:
            assert label in PUBLIC_SHELL, f"primary nav missing {label!r}"

    def test_primary_nav_is_a_reusable_export(self):
        # Must be exportable so notebook chrome can mount the same row.
        assert "export function PrimaryNav" in PUBLIC_SHELL or "export function PublicNav" in PUBLIC_SHELL
        # PublicNav alone is not enough unless Nav reuses it — prefer PrimaryNav.
        assert "PrimaryNav" in PUBLIC_SHELL

    def test_notebook_nav_mounts_primary_nav(self):
        # Notebook must render the primary row, not only secondary register tabs.
        assert "PrimaryNav" in NAV, "Nav.tsx does not mount PrimaryNav"
        for label in PRIMARY_LABELS:
            # Either inlined or via PrimaryNav import — labels live in PublicShell.
            pass
        assert "from" in NAV and "PrimaryNav" in NAV

    def test_notebook_keeps_secondary_registers(self):
        # Secondary items remain, subordinate to primary.
        for label in ("Contents", "Capabilities", "Issues", "Wallet"):
            assert label in NAV, f"notebook secondary nav missing {label!r}"

    def test_notebook_layout_uses_nav_component(self):
        # Sanity: signed-in notebook still goes through Nav (which now has both rows).
        assert "<Nav" in APP or "Nav />" in APP
