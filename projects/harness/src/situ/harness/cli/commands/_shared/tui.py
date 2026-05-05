from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from ..._shared import apply_session_env
from ....core.db.project_registry import upsert_project_registry
from ....core.paths import resolve_app_root, resolve_workspace
from ....core.project_context import ProjectContext
from ...local_session import base_env, read_live_session, start_session_server, stop_process


def launch_managed_tui(
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

    if read_live_session(workspace) is not None:
        print(
            "active Situ harness found for this workspace; use situ attach or stop it first",
            file=sys.stderr,
        )
        return 1

    context = ProjectContext(workspace)
    upsert_project_registry(
        situ_home=context.home,
        project_id=context.project_id,
        repo_path=context.repo_root,
    )

    env = base_env(app_root, workspace)
    apply_session_env(env, args)
    env["SITU_SESSION_MODE"] = mode

    session_process, session = start_session_server(app_root, workspace, env)
    env["SITU_SESSION_URL"] = session["url"]
    env["SITU_SESSION_TOKEN"] = session["token"]

    try:
        return run_tui(app_root=app_root, env=env)
    finally:
        stop_process(session_process)


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
