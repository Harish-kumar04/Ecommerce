"""Synchronize internal monorepo Python packages into ``apps/api/_packages/`` for Vercel Serverless.

When Vercel builds the ``api`` service with ``"root": "apps/api"`` and ``"entrypoint": "main:app"``,
only files inside ``apps/api/`` are included in the ``/var/task`` serverless function bundle
(completely isolating it from sibling Next.js apps ``apps/storefront``, ``apps/admin``, and
``apps/platform-admin``). Notably, ``@vercel/python`` uses ``/var/task/_vendor`` internally for
installed PyPI wheels, so we vendor ``packages/*/src/infalette_*`` and ``scripts/demo_seed.py``
into ``apps/api/_packages/`` (~520 KB) with zero directory overlap.
"""

from __future__ import annotations

import shutil
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PACKAGES_DIR = REPO_ROOT / "packages"
LEGACY_VENDOR_DIRS = (
    REPO_ROOT / "apps" / "_vendor",
    REPO_ROOT / "apps" / "api" / "_vendor",
)
VENDOR_DIR = REPO_ROOT / "apps" / "api" / "_packages"


def sync() -> None:
    for legacy_dir in LEGACY_VENDOR_DIRS:
        if legacy_dir.exists():
            shutil.rmtree(legacy_dir)
    if VENDOR_DIR.exists():
        shutil.rmtree(VENDOR_DIR)
    VENDOR_DIR.mkdir(parents=True, exist_ok=True)

    copied_packages: list[str] = []
    for pkg_src in sorted(PACKAGES_DIR.glob("*/src/infalette_*")):
        if not pkg_src.is_dir():
            continue
        dest = VENDOR_DIR / pkg_src.name
        shutil.copytree(
            pkg_src,
            dest,
            ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.pyo", ".pytest_cache"),
        )
        copied_packages.append(pkg_src.name)

    seeder_src = REPO_ROOT / "scripts" / "demo_seed.py"
    if seeder_src.is_file():
        shutil.copy2(seeder_src, VENDOR_DIR / "demo_seed.py")

    print(f"Synced {len(copied_packages)} packages + demo_seed.py into {VENDOR_DIR}:")
    for name in copied_packages:
        print(f"  - {name}")


if __name__ == "__main__":
    sync()
