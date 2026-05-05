from __future__ import annotations

import os
from pathlib import Path


def find_app_root(start: Path) -> Path | None:
    candidate = start.resolve()
    if candidate.is_file():
        candidate = candidate.parent

    for directory in [candidate, *candidate.parents]:
        if (directory / "projects" / "tui").is_dir() and (directory / "projects" / "harness").is_dir():
            return directory

    return None


def resolve_app_root(start: Path) -> Path | None:
    configured = os.environ.get("SITU_APP_ROOT")
    if configured:
        return Path(configured).expanduser().resolve()
    return find_app_root(start)


def resolve_workspace(start: Path, workspace: str | None = None) -> Path:
    configured = workspace or os.environ.get("SITU_WORKSPACE")
    root = Path(configured).expanduser() if configured else start
    if not root.is_absolute():
        root = Path.cwd() / root
    return root.resolve()
