from __future__ import annotations

import argparse
import sys

from ....core.install_info import InstallInfo, install_info
from ...headless._shared.output import write_json


def run(args: argparse.Namespace) -> int:
    info = install_info()
    if bool(getattr(args, "json", False)):
        write_json(_payload(info))
        return 0
    sys.stdout.write(format_one_line(info) + "\n")
    return 0


def format_one_line(info: InstallInfo) -> str:
    sha = f" {info.git_sha[:8]}" if info.git_sha else ""
    return f"situ {info.version}{sha} ({info.method})"


def _payload(info: InstallInfo) -> dict[str, object]:
    return {
        "version": info.version,
        "method": info.method,
        "git_sha": info.git_sha,
        "install_home": str(info.install_home) if info.install_home else None,
        "version_dir": str(info.version_dir) if info.version_dir else None,
        "bin_path": str(info.bin_path) if info.bin_path else None,
    }
