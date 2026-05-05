from __future__ import annotations

import argparse
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
    workspace = resolve_existing_workspace(args)
    if workspace is None:
        return 1

    if args.follow:
        return follow_live_events(workspace)

    try:
        _source, snapshot = load_snapshot(workspace)
    except Exception as error:
        print(error_message(error), file=sys.stderr)
        return 1

    for event in snapshot.get("events", []):
        write_json_line({"type": "event", "event": event})
    return 0


def follow_live_events(workspace: Path) -> int:
    session = read_live_session(workspace)
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
        with open_event_stream(session) as response:
            rpc_request(session, "events.subscribe", {"replay_existing": True})
            for notification in iter_sse_notifications(response):
                write_notification(notification)
    except KeyboardInterrupt:
        return 130
    except Exception as error:
        print(error_message(error), file=sys.stderr)
        return 1
    return 0
