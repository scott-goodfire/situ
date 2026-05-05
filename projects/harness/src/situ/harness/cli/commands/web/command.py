from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

from ....core.paths import resolve_app_root


def run(args: argparse.Namespace) -> int:
    app_root = resolve_app_root(Path(__file__))
    if app_root is None:
        print("could not find Situ app root; set SITU_APP_ROOT", file=sys.stderr)
        return 1

    env = os.environ.copy()
    env["SITU_APP_ROOT"] = str(app_root)
    env.pop("SITU_WORKSPACE", None)

    web_root = app_root / "projects" / "web"
    if should_build_web(web_root, rebuild=args.rebuild):
        build = subprocess.run(
            ["bun", "run", "build"],
            cwd=web_root,
            env=env,
        )
        if build.returncode != 0:
            return build.returncode

    return subprocess.run(
        [
            "bun",
            "run",
            "serve",
            "--",
            "--host",
            args.host,
            "--port",
            str(args.port),
        ],
        cwd=web_root,
        env=env,
    ).returncode


def should_build_web(web_root: Path, *, rebuild: bool) -> bool:
    return rebuild or not (web_root / "dist" / "index.html").is_file()
