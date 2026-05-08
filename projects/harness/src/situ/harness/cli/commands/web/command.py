from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

import aiofiles.ospath

from ..._shared.process import run_process
from ....core.paths import (
    find_bundled_resource,
    resolve_app_root,
    resolve_bundled_runtime,
)


def run(args: argparse.Namespace) -> int:
    return asyncio.run(run_async(args))


async def run_async(args: argparse.Namespace) -> int:
    runtime = await resolve_bundled_runtime("web-server", source_dir="web")
    if runtime is None:
        print(
            "could not resolve web-server runtime; "
            "run from a Situ source checkout, set SITU_APP_ROOT, or reinstall Situ",
            file=sys.stderr,
        )
        return 1

    env = os.environ.copy()
    env.pop("SITU_WORKSPACE", None)

    if runtime.kind == "installed":
        env.pop("SITU_APP_ROOT", None)
        web_dist = await find_bundled_resource("web")
        if web_dist is None or not await aiofiles.ospath.isfile(web_dist / "index.html"):
            print(
                "Situ web bundle is missing or incomplete; reinstall Situ.",
                file=sys.stderr,
            )
            return 1
        argv = [
            str(runtime.path),
            "--host",
            args.host,
            "--port",
            str(args.port),
            "--dist",
            str(web_dist),
        ]
        return await run_process(argv, env=env)

    app_root = await resolve_app_root(Path(__file__))
    if app_root is None:
        print("could not find Situ app root; set SITU_APP_ROOT", file=sys.stderr)
        return 1
    env["SITU_APP_ROOT"] = str(app_root)

    web_root = runtime.source_cwd
    assert web_root is not None
    if await should_build_web(web_root, rebuild=args.rebuild):
        build_code = await run_process(
            ["bun", "run", "build"],
            cwd=web_root,
            env=env,
        )
        if build_code != 0:
            return build_code

    return await run_process(
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
    )


async def should_build_web(web_root: Path, *, rebuild: bool) -> bool:
    return rebuild or not await aiofiles.ospath.isfile(web_root / "dist" / "index.html")
