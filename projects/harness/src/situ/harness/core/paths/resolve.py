from __future__ import annotations

import os
from pathlib import Path

import aiofiles.ospath


async def find_app_root(start: Path) -> Path | None:
    candidate = start.resolve()
    if await aiofiles.ospath.isfile(candidate):
        candidate = candidate.parent

    for directory in [candidate, *candidate.parents]:
        if await aiofiles.ospath.isdir(
            directory / "projects" / "tui"
        ) and await aiofiles.ospath.isdir(directory / "projects" / "harness"):
            return directory

    return None


async def resolve_app_root(start: Path) -> Path | None:
    configured = os.environ.get("SITU_APP_ROOT")
    if configured:
        return Path(configured).expanduser().resolve()
    return await find_app_root(start)


async def resolve_workspace(start: Path, workspace: str | None = None) -> Path:
    configured = workspace or os.environ.get("SITU_WORKSPACE")
    root = Path(configured).expanduser() if configured else start
    if not root.is_absolute():
        root = Path.cwd() / root
    return root.resolve()
