from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from ...local_session import read_live_session
from .._shared.output import error_message, write_json, write_json_line
from .._shared.rpc import (
    iter_sse_notifications,
    open_event_stream,
    rpc_request,
    write_notification,
)
from .._shared.snapshot import load_snapshot
from .._shared.workspace import resolve_existing_workspace


def run(args: argparse.Namespace) -> int:
    return asyncio.run(run_async(args))


async def run_async(args: argparse.Namespace) -> int:
    workspace = await resolve_existing_workspace(args)
    if workspace is None:
        return 1

    if args.follow:
        return await follow_live_events(workspace)

    try:
        _source, snapshot = await load_snapshot(workspace)
    except Exception as error:
        print(error_message(error), file=sys.stderr)
        return 1

    for event in snapshot.get("events", []):
        write_json_line({"type": "event", "event": event})
    return 0


async def follow_live_events(workspace: Path) -> int:
    session = await read_live_session(workspace)
    if session is None:
        write_json(
            {
                "workspace": str(workspace),
                "error": "no_active_harness",
                "message": "no active harness found",
            }
        )
        return 1

    try:
        await asyncio.to_thread(_follow_live_events_sync, session)
    except KeyboardInterrupt:
        return 130
    except Exception as error:
        print(error_message(error), file=sys.stderr)
        return 1
    return 0


def _follow_live_events_sync(session: dict[str, str]) -> None:
    with open_event_stream(session) as response:
        rpc_request(session, "events.subscribe", {"replay_existing": True})
        for notification in iter_sse_notifications(response):
            write_notification(notification)
