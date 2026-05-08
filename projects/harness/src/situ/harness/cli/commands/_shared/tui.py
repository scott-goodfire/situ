from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

import aiofiles.ospath

from ..._shared import apply_session_env
from ..._shared.process import run_process
from ....core.paths import (
    BundledRuntime,
    resolve_app_root,
    resolve_bundled_runtime,
    resolve_workspace,
)
from ....core.worktrees import require_clean_if_git_workspace
from ...local_session import base_env, read_live_app


def launch_app_tui(
    *,
    args: argparse.Namespace,
    mode: str,
) -> int:
    return asyncio.run(launch_app_tui_async(args=args, mode=mode))


async def launch_app_tui_async(
    *,
    args: argparse.Namespace,
    mode: str,
) -> int:
    runtime = await resolve_bundled_runtime("tui")
    if runtime is None:
        print(
            "could not resolve TUI runtime; "
            "run from a Situ source checkout, set SITU_APP_ROOT, or reinstall Situ",
            file=sys.stderr,
        )
        return 1

    workspace = await resolve_workspace(Path.cwd(), args.workspace)
    if not await aiofiles.ospath.isdir(workspace):
        print(f"workspace does not exist or is not a directory: {workspace}", file=sys.stderr)
        return 1

    if mode == "start":
        try:
            await require_clean_if_git_workspace(
                workspace,
                action="starting a Situ session",
            )
        except RuntimeError as error:
            print(str(error), file=sys.stderr)
            return 1

    app = await read_live_app()
    if app is None:
        print("no active Situ app found; run situ app in another terminal", file=sys.stderr)
        return 1

    app_root = await resolve_app_root(Path(__file__)) if runtime.kind == "source" else None
    env = base_env(app_root, workspace)
    apply_session_env(env, args)
    env["SITU_SESSION_MODE"] = mode
    env["SITU_APP_URL"] = app["url"]
    env["SITU_APP_TOKEN"] = app["token"]
    env["SITU_SESSION_URL"] = app["url"]
    env["SITU_SESSION_TOKEN"] = app["token"]

    return await run_tui(runtime=runtime, env=env)


async def run_tui(*, runtime: BundledRuntime, env: dict[str, str]) -> int:
    argv, cwd = runtime.subprocess_args()
    return await run_process(argv, cwd=cwd, env=env)
