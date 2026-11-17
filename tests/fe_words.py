"""The site's English, put back where the pages ask for it.

The frontend reads its words from ``frontend/src/i18n/en.ts`` by key
(``t("key")``, ``<Tx k="key" …/>``). The copy contracts in this folder read
the page source, so they read it through :func:`english`, which swaps each key
for its English in place. Order and structure are kept.
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FE = ROOT / "frontend/src"


def _catalog() -> dict[str, str]:
    text = (FE / "i18n/en.ts").read_text()
    return {k: json.loads(f'"{v}"') for k, v in re.findall(r'^  "([^"]+)": "((?:[^"\\]|\\.)*)",$', text, re.MULTILINE)}


CATALOG = _catalog()


def english(source: str) -> str:
    """``source`` with every ``t("key", …)`` and ``k="key"`` replaced by its English."""
    source = re.sub(r'\bt\("([^"]+)"(?:,[^)\n]*)?\)', lambda m: CATALOG.get(m.group(1), m.group(0)), source)
    return re.sub(r'\bk="([^"]+)"', lambda m: f'k="{CATALOG.get(m.group(1), m.group(1))}"', source)


def page(relative: str) -> str:
    """A frontend source file, read in English."""
    return english((FE / relative).read_text())
