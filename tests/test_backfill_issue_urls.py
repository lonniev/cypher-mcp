"""Pure helpers of the URL backfill migration — owner parsing and URL building.

The live migration needs an operator nsec and the graph; these guard only the
no-I/O helpers that decide the URLs, so a wrong owner never gets written.
"""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from backfill_issue_urls import parse_owner_repo, issue_urls  # noqa: E402


class TestParseOwnerRepo:
    def test_https_with_git_suffix(self):
        assert parse_owner_repo("https://github.com/lonniev/cypher-mcp.git") == ("lonniev", "cypher-mcp")

    def test_https_without_suffix(self):
        assert parse_owner_repo("https://github.com/acme/tollbooth-sample") == ("acme", "tollbooth-sample")

    def test_ssh_form(self):
        assert parse_owner_repo("git@github.com:lonniev/tollbooth-sample.git") == ("lonniev", "tollbooth-sample")

    def test_non_github_is_none(self):
        assert parse_owner_repo("https://gitlab.com/x/y") is None


class TestIssueUrls:
    def test_builds_issue_and_repo_urls(self):
        # /issues/<n> is used even for PRs — GitHub redirects it to /pull/<n>.
        assert issue_urls("lonniev", "tollbooth-sample", 64) == (
            "https://github.com/lonniev/tollbooth-sample/issues/64",
            "https://github.com/lonniev/tollbooth-sample",
        )

    def test_owner_is_never_hardcoded(self):
        # The owner is whatever the caller resolved at runtime — a different owner
        # flows straight through, proving nothing is baked in.
        iu, ru = issue_urls("someone-else", "repo", 7)
        assert iu.startswith("https://github.com/someone-else/repo/issues/7")
        assert ru == "https://github.com/someone-else/repo"
