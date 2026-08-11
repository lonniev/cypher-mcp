"""Join page must not present Scout as the way to join (#83).

Visitors create their own Nostr identity and prove ownership. Scout is a
separate field-report identity agents use when filing issues — not an
onboarding path, not a shared account, and not something a visitor signs in as.

This is a content contract over the FE source strings — there is no frontend
test runner in this repo, and the defect is purely copy.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JOIN_PAGE = (ROOT / "frontend/src/components/public/JoinPage.tsx").read_text()
HOME_PAGE = (ROOT / "frontend/src/components/public/HomePage.tsx").read_text()
FACTORY_MODEL = (ROOT / "frontend/src/lib/factoryModel.ts").read_text()


def _header(text: str = JOIN_PAGE) -> str:
    end = text.find("</header>")
    assert end >= 0, "Join page has no </header>"
    return text[:end]


class TestJoinPageOwnIdentity:
    def test_does_not_present_scout_as_joining_path(self):
        # Acceptance 2: Scout is not a joining mechanism.
        surface = JOIN_PAGE + "\n" + HOME_PAGE
        for banned in (
            "Join via Scout",
            "join via Scout",
            "Scout is the on-ramp",
            "Scout is the on ramp",
        ):
            assert banned not in surface, f"still frames Scout as the join path: {banned!r}"

    def test_lede_is_bring_your_own_identity(self):
        # Acceptance 1: creating one's own Nostr identity is the way in.
        header = _header().lower()
        asserts_own_identity = any(
            phrase in header
            for phrase in (
                "your own identity",
                "your own nostr",
                "bring your own",
                "create your own",
                "you generate",
                "self-issued",
            )
        )
        asserts_keypair = any(
            phrase in header
            for phrase in (
                "nostr keypair",
                "nostr identity",
                "npub",
                "keypair",
            )
        )
        assert asserts_own_identity, (
            "Join page lede never says the visitor creates / brings their own identity"
        )
        assert asserts_keypair, "Join page lede never names a Nostr keypair / npub"

    def test_proof_flow_is_explained(self):
        # Signing in = prove control of the key via signed challenge/reply.
        lowered = JOIN_PAGE.lower()
        asserts_proof = any(
            phrase in lowered
            for phrase in (
                "prove",
                "proof",
                "challenge",
                "signed",
            )
        )
        asserts_dm_or_client = any(
            phrase in lowered
            for phrase in (
                "nostr client",
                "signed dm",
                "reply",
                "dpop",
            )
        )
        assert asserts_proof, "Join page never explains ownership proof"
        assert asserts_dm_or_client, "Join page never mentions the Nostr client / reply step"

    def test_if_scout_appears_it_is_agents_filing_identity(self):
        # Acceptance 3: Scout, if mentioned, is the agents' issue-filing identity.
        if "Scout" not in JOIN_PAGE:
            return
        # Must not be the H1 / on-ramp frame.
        header = _header()
        assert "Scout" not in header or "not" in JOIN_PAGE.lower()
        lowered = JOIN_PAGE.lower()
        asserts_correct_role = any(
            phrase in lowered
            for phrase in (
                "field-report",
                "field report",
                "issue-filing",
                "filing issues",
                "agents use",
                "agents' ",
                "not an account you sign in",
                "not how you join",
                "not a joining",
            )
        )
        assert asserts_correct_role, (
            "Join page mentions Scout without describing it as the agents' "
            "issue-filing / field-report identity"
        )


class TestScoutRoleBlurb:
    def test_crew_blurb_is_not_visitor_on_ramp(self):
        # Shared roster copy must not teach "Scout = how visitors join".
        # Locate the Scout role blurb in factoryModel.
        idx = FACTORY_MODEL.find('name: "Scout"')
        assert idx >= 0, "Scout role missing from CREW"
        snippet = FACTORY_MODEL[idx : idx + 280]
        assert "On-ramp" not in snippet and "on-ramp" not in snippet, (
            "Scout crew blurb still calls Scout the on-ramp"
        )
