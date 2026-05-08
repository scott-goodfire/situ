from __future__ import annotations

import sys
from dataclasses import dataclass
from importlib.metadata import PackageNotFoundError, version as package_version
from pathlib import Path
from typing import Literal


InstallMethod = Literal["curl", "source", "unknown"]


@dataclass(frozen=True)
class InstallInfo:
    method: InstallMethod
    version: str
    install_home: Path | None
    version_dir: Path | None
    bin_path: Path | None
    git_sha: str | None


def install_info() -> InstallInfo:
    method, install_home, version_dir = _detect_install_method()
    return InstallInfo(
        method=method,
        version=_resolve_version(method=method, version_dir=version_dir),
        install_home=install_home,
        version_dir=version_dir,
        bin_path=_resolve_bin_path(version_dir=version_dir),
        git_sha=_resolve_git_sha(),
    )


def _detect_install_method() -> tuple[InstallMethod, Path | None, Path | None]:
    """Return (method, install_home, version_dir).

    A curl-installed Situ runs from <install_home>/versions/<tag>/venv/bin/python.
    """
    try:
        exe = Path(sys.executable).resolve()
    except OSError:
        return "unknown", None, None

    if (
        exe.name == "python"
        and exe.parent.name == "bin"
        and exe.parent.parent.name == "venv"
    ):
        version_dir = exe.parent.parent.parent
        versions_dir = version_dir.parent
        if versions_dir.name == "versions":
            install_home = versions_dir.parent
            return "curl", install_home, version_dir

    return "source", None, None


def _resolve_version(*, method: InstallMethod, version_dir: Path | None) -> str:
    if method == "curl" and version_dir is not None:
        return version_dir.name
    try:
        return package_version("situ-harness")
    except PackageNotFoundError:
        return "0.0.0"


def _resolve_bin_path(*, version_dir: Path | None) -> Path | None:
    if version_dir is None:
        return None
    candidate = version_dir / "bin" / "situ"
    return candidate if candidate.exists() else None


def _resolve_git_sha() -> str | None:
    try:
        from . import _build_info  # type: ignore[import-not-found]
    except ImportError:
        return None
    return getattr(_build_info, "GIT_SHA", None)
