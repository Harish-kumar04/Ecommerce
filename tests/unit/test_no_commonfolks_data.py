"""Regression guard: ensure no CommonFolks or legacy S3 hot-links remain in apps/ or scripts/."""

from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCAN_ROOTS = (REPO_ROOT / "apps", REPO_ROOT / "scripts")
SKIP_DIRS = {"node_modules", ".next", "__pycache__", ".pytest_cache", ".git", ".venv"}
SKIP_EXTS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".avif",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".pdf",
    ".xlsx",
    ".db",
    ".sqlite",
    ".tsbuildinfo",
}
FORBIDDEN_SUBSTRINGS = (
    "commonfolks",
    "storage.commonfolks.in",
    "s3.ap-south-1.amazonaws.com",
)


def test_no_commonfolks_references_in_apps_or_scripts() -> None:
    violations: list[str] = []

    for scan_root in SCAN_ROOTS:
        if not scan_root.exists():
            continue
        for dirpath, dirs, files in os.walk(scan_root):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for filename in files:
                path = Path(dirpath) / filename
                if path.suffix.lower() in SKIP_EXTS:
                    continue
                try:
                    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
                except OSError:
                    continue
                rel = path.relative_to(REPO_ROOT).as_posix()
                for line_no, line in enumerate(lines, start=1):
                    low = line.lower()
                    for forbidden in FORBIDDEN_SUBSTRINGS:
                        if forbidden in low:
                            violations.append(f"{rel}:{line_no} contains '{forbidden}'")

    assert not violations, "Forbidden reference(s) found:\n" + "\n".join(violations)
