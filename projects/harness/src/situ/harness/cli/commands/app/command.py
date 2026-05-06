from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from ....core.paths import resolve_app_root
from ...local_session import base_env, read_live_app


def run(args: argparse.Namespace) -> int:
    app_root = resolve_app_root(Path(__file__))
    if app_root is None:
        print("could not find Situ app root; set SITU_APP_ROOT", file=sys.stderr)
        return 1

    live_app = read_live_app()
    if live_app is not None and not bool(getattr(args, "force", False)):
        print(f"Situ app already running at {live_app['url']}", file=sys.stderr)
        return 0

    env = base_env(app_root)
    return subprocess.run(
        ["bun", "run", "dev"],
        cwd=app_root / "projects" / "session-server",
        env=env,
    ).returncode
