from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from ..._shared import apply_session_env
from ....core.paths import resolve_app_root, resolve_workspace
from ....core.worktrees import require_clean_if_git_workspace
from ...local_session import base_env, read_live_app


def launch_app_tui(
    *,
    args: argparse.Namespace,
    mode: str,
) -> int:
    app_root = resolve_app_root(Path(__file__))
    if app_root is None:
        print("could not find Situ app root; set SITU_APP_ROOT", file=sys.stderr)
        return 1

    workspace = resolve_workspace(Path.cwd(), args.workspace)
    if not workspace.is_dir():
        print(f"workspace does not exist or is not a directory: {workspace}", file=sys.stderr)
        return 1

    if mode == "start":
        try:
            require_clean_if_git_workspace(
                workspace,
                action="starting a Situ session",
            )
        except RuntimeError as error:
            print(str(error), file=sys.stderr)
            return 1

    app = read_live_app()
    if app is None:
        print("no active Situ app found; run situ app in another terminal", file=sys.stderr)
        return 1

    env = base_env(app_root, workspace)
    apply_session_env(env, args)
    env["SITU_SESSION_MODE"] = mode
    env["SITU_APP_URL"] = app["url"]
    env["SITU_APP_TOKEN"] = app["token"]
    env["SITU_SESSION_URL"] = app["url"]
    env["SITU_SESSION_TOKEN"] = app["token"]

    return run_tui(app_root=app_root, env=env)


def run_tui(
    *,
    app_root: Path,
    env: dict[str, str],
) -> int:
    return subprocess.run(
        ["bun", "run", "dev"],
        cwd=app_root / "projects" / "tui",
        env=env,
    ).returncode
