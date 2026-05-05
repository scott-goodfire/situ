from __future__ import annotations

import argparse
import sys
import time

from ...local_session import read_live_session
from .._shared.output import error_message, write_json
from .._shared.snapshot import load_snapshot
from .._shared.timing import is_deadline_expired, latest_record, timeout_deadline
from .._shared.workspace import resolve_existing_workspace


def run(args: argparse.Namespace) -> int:
    workspace = resolve_existing_workspace(args)
    if workspace is None:
        return 1

    deadline = timeout_deadline(args.timeout)

    while True:
        live_session = read_live_session(workspace)
        try:
            source, snapshot = load_snapshot(workspace)
        except Exception as error:
            print(error_message(error), file=sys.stderr)
            return 1

        sessions = snapshot.get("sessions", [])
        active_sessions = [
            session for session in sessions if session.get("status") == "active"
        ]

        if not sessions:
            write_json(
                {
                    "workspace": str(workspace),
                    "completed": False,
                    "reason": "no_sessions",
                    "source": source,
                }
            )
            return 1

        if not active_sessions:
            write_json(
                {
                    "workspace": str(workspace),
                    "completed": True,
                    "source": source,
                    "session": latest_record(sessions),
                    "snapshot": snapshot,
                }
            )
            return 0

        if live_session is None:
            write_json(
                {
                    "workspace": str(workspace),
                    "completed": False,
                    "reason": "no_active_harness",
                    "active_sessions": active_sessions,
                    "source": source,
                }
            )
            return 1

        if is_deadline_expired(deadline):
            write_json(
                {
                    "workspace": str(workspace),
                    "completed": False,
                    "reason": "timeout",
                    "active_sessions": active_sessions,
                    "source": source,
                }
            )
            return 124

        time.sleep(0.5)
