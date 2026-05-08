from __future__ import annotations

import argparse
import asyncio

from ...local_session import ping_session, read_session_record
from .._shared.output import write_json
from .._shared.workspace import resolve_existing_workspace


def run(args: argparse.Namespace) -> int:
    return asyncio.run(run_async(args))


async def run_async(args: argparse.Namespace) -> int:
    workspace = await resolve_existing_workspace(args)
    if workspace is None:
        return 1

    record = await read_session_record(workspace)
    active = False
    session = None
    stale_session = None

    if record is not None and await ping_session(record):
        active = True
        session = record
    elif record is not None:
        stale_session = record

    message = "active harness found" if active else "no active harness found"
    write_json(
        {
            "workspace": str(workspace),
            "active": active,
            "message": message,
            "session": session,
            "stale_session": stale_session,
        }
    )
    return 0
