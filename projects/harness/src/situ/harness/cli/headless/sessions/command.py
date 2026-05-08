from __future__ import annotations

import argparse
import asyncio
import sys

from .._shared.output import error_message, write_json
from .._shared.snapshot import load_snapshot
from .._shared.workspace import resolve_existing_workspace


def run(args: argparse.Namespace) -> int:
    return asyncio.run(run_async(args))


async def run_async(args: argparse.Namespace) -> int:
    workspace = await resolve_existing_workspace(args)
    if workspace is None:
        return 1

    try:
        source, snapshot = await load_snapshot(workspace)
    except Exception as error:
        print(error_message(error), file=sys.stderr)
        return 1

    write_json(
        {
            "workspace": str(workspace),
            "source": source,
            "sessions": snapshot.get("sessions", []),
        }
    )
    return 0
