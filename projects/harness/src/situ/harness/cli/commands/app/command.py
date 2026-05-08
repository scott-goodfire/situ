from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

import aiofiles.ospath

from ....core.paths import (
    BundledRuntime,
    find_bundled_resource,
    resolve_app_root,
    resolve_bundled_runtime,
)
from ..._shared.process import run_process
from ...local_session import (
    base_env,
    live_app_matches_env,
    live_app_mismatch_message,
    read_live_app,
)


def run(args: argparse.Namespace) -> int:
    return asyncio.run(run_async(args))


async def run_async(args: argparse.Namespace) -> int:
    runtime = await resolve_bundled_runtime("session-server")
    if runtime is None:
        print(
            "could not resolve session-server runtime; "
            "run from a Situ source checkout, set SITU_APP_ROOT, or reinstall Situ",
            file=sys.stderr,
        )
        return 1

    app_root = await resolve_app_root(Path(__file__))
    env = base_env(app_root)

    live_app = await read_live_app()
    if live_app is not None and not bool(getattr(args, "force", False)):
        if not live_app_matches_env(live_app, env):
            print(live_app_mismatch_message(live_app, env), file=sys.stderr)
            return 1
        print(f"Situ app already running at {live_app['url']}", file=sys.stderr)
        return 0

    web_dist = await resolve_web_dist(
        runtime=runtime,
        app_root=app_root,
        rebuild=bool(getattr(args, "rebuild_web", False)),
        env=env,
    )
    if web_dist is None:
        return 1

    argv, cwd = app_server_command(runtime=runtime, args=args, web_dist=web_dist)
    return await run_process(argv, cwd=cwd, env=env)


async def resolve_web_dist(
    *,
    runtime: BundledRuntime,
    app_root: Path | None,
    rebuild: bool,
    env: dict[str, str],
) -> Path | None:
    if runtime.kind == "installed":
        web_dist = await find_bundled_resource("web")
        if web_dist is None or not await aiofiles.ospath.isfile(web_dist / "index.html"):
            print(
                "Situ web bundle is missing or incomplete; reinstall Situ.",
                file=sys.stderr,
            )
            return None
        return web_dist

    if app_root is None:
        print("could not find Situ app root; set SITU_APP_ROOT", file=sys.stderr)
        return None

    web_root = app_root / "projects" / "web"
    web_dist = web_root / "dist"
    if rebuild or not await aiofiles.ospath.isfile(web_dist / "index.html"):
        build_code = await run_process(
            ["bun", "run", "build"],
            cwd=web_root,
            env=env,
        )
        if build_code != 0:
            return None

    return web_dist


def app_server_command(
    *,
    runtime: BundledRuntime,
    args: argparse.Namespace,
    web_dist: Path,
) -> tuple[list[str], Path | None]:
    argv, cwd = runtime.subprocess_args()
    server_args = [
        "--host",
        str(args.host),
        "--port",
        str(args.port),
        "--web-dist",
        str(web_dist),
    ]
    if runtime.kind == "source":
        return [*argv, "--", *server_args], cwd
    return [*argv, *server_args], cwd
