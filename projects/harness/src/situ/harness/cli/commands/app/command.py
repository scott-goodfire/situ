from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from ....core.paths import resolve_app_root, resolve_bundled_runtime
from ...local_session import base_env, read_live_app


def run(args: argparse.Namespace) -> int:
    runtime = resolve_bundled_runtime("session-server")
    if runtime is None:
        print(
            "could not resolve session-server runtime; "
            "run from a Situ source checkout, set SITU_APP_ROOT, or reinstall Situ",
            file=sys.stderr,
        )
        return 1

    live_app = read_live_app()
    if live_app is not None and not bool(getattr(args, "force", False)):
        print(f"Situ app already running at {live_app['url']}", file=sys.stderr)
        return 0

    app_root = resolve_app_root(Path(__file__)) if runtime.kind == "source" else None
    env = base_env(app_root)
    argv, cwd = runtime.subprocess_args()
    return subprocess.run(argv, cwd=cwd, env=env).returncode
