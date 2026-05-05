from __future__ import annotations

import argparse
import sys
from pathlib import Path

from ....core.paths import resolve_app_root, resolve_workspace
from ...local_session import base_env, read_live_session
from .._shared.tui import run_tui


def run(args: argparse.Namespace) -> int:
    app_root = resolve_app_root(Path(__file__))
    if app_root is None:
        print("could not find Situ app root; set SITU_APP_ROOT", file=sys.stderr)
        return 1

    workspace = resolve_workspace(Path.cwd(), args.workspace)
    if not workspace.is_dir():
        print(f"workspace does not exist or is not a directory: {workspace}", file=sys.stderr)
        return 1

    session = read_live_session(workspace)
    if session is None:
        print("no active Situ harness found for this workspace", file=sys.stderr)
        return 1

    env = base_env(app_root, workspace)
    env["SITU_SESSION_MODE"] = "attach"
    env["SITU_SESSION_URL"] = session["url"]
    env["SITU_SESSION_TOKEN"] = session["token"]
    return run_tui(app_root=app_root, env=env)
