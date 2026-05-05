from __future__ import annotations

import argparse

from ...local_session import ping_session, read_session_record
from .._shared.output import write_json
from .._shared.workspace import resolve_existing_workspace


def run(args: argparse.Namespace) -> int:
    workspace = resolve_existing_workspace(args)
    if workspace is None:
        return 1

    record = read_session_record(workspace)
    active = False
    session = None
    stale_session = None

    if record is not None and ping_session(record):
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
