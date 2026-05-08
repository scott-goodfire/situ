from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from ....core.paths import resolve_app_root
from ...local_session import (
    base_env,
    live_app_matches_env,
    live_app_mismatch_message,
    read_live_app,
)


def run(args: argparse.Namespace) -> int:
    return asyncio.run(run_async(args))


async def run_async(args: argparse.Namespace) -> int:
    if bool(getattr(args, "rebuild", False)):
        print(
            "situ web resolves an existing app-hosted monitor; "
            "use `situ app --rebuild-web` to rebuild and serve web assets",
            file=sys.stderr,
        )
        return 1
    if getattr(args, "host", "127.0.0.1") != "127.0.0.1" or getattr(args, "port", 0) != 0:
        print(
            "situ web does not bind a server; use `situ app --host ... --port ...`",
            file=sys.stderr,
        )
        return 1

    app_root = await resolve_app_root(Path(__file__))
    env = base_env(app_root)
    live_app = await read_live_app()
    if live_app is None:
        print("no active Situ app found; run `situ app`", file=sys.stderr)
        return 1
    if not live_app_matches_env(live_app, env):
        print(live_app_mismatch_message(live_app, env), file=sys.stderr)
        return 1

    print(live_app["url"])
    return 0
