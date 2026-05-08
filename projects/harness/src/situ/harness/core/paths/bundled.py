from __future__ import annotations

import importlib.resources as ires
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from .resolve import resolve_app_root


RuntimeKind = Literal["installed", "source"]

BUNDLED_PACKAGE = "situ._bundled"


@dataclass(frozen=True)
class BundledRuntime:
    kind: RuntimeKind
    path: Path
    source_cwd: Path | None


def find_bundled_resource(name: str) -> Path | None:
    try:
        anchor = ires.files(BUNDLED_PACKAGE)
    except ModuleNotFoundError:
        return None
    target = anchor / name
    try:
        path = Path(os.fspath(target))
    except (TypeError, NotImplementedError):
        return None
    if not path.exists():
        return None
    return path


def resolve_bundled_runtime(name: str, *, source_dir: str) -> BundledRuntime | None:
    bundled = find_bundled_resource(name)
    if bundled is not None:
        return BundledRuntime(kind="installed", path=bundled, source_cwd=None)

    app_root = resolve_app_root(Path(__file__))
    if app_root is None:
        return None
    source_cwd = app_root / "projects" / source_dir
    if not source_cwd.is_dir():
        return None
    return BundledRuntime(kind="source", path=source_cwd, source_cwd=source_cwd)
