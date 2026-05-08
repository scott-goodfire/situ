from __future__ import annotations

import importlib.resources as ires
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import aiofiles.ospath

from .resolve import resolve_app_root


RuntimeKind = Literal["installed", "source"]

BUNDLED_PACKAGE = "situ._bundled"


@dataclass(frozen=True)
class BundledRuntime:
    kind: RuntimeKind
    path: Path
    source_cwd: Path | None

    def subprocess_args(self) -> tuple[list[str], Path | None]:
        if self.kind == "installed":
            return [str(self.path)], None
        return ["bun", "run", "dev"], self.source_cwd


async def find_bundled_resource(name: str) -> Path | None:
    try:
        anchor = ires.files(BUNDLED_PACKAGE)
    except ModuleNotFoundError:
        return None
    target = anchor / name
    try:
        path = Path(os.fspath(target))
    except (TypeError, NotImplementedError):
        return None
    if not await aiofiles.ospath.exists(path):
        return None
    return path


async def resolve_bundled_runtime(
    name: str, *, source_dir: str | None = None
) -> BundledRuntime | None:
    bundled = await find_bundled_resource(name)
    if bundled is not None:
        return BundledRuntime(kind="installed", path=bundled, source_cwd=None)

    app_root = await resolve_app_root(Path(__file__))
    if app_root is None:
        return None
    source_cwd = app_root / "projects" / (source_dir or name)
    if not await aiofiles.ospath.isdir(source_cwd):
        return None
    return BundledRuntime(kind="source", path=source_cwd, source_cwd=source_cwd)
