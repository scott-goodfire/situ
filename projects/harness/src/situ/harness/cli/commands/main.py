from __future__ import annotations

import argparse

from ..headless import (
    headless_clear,
    headless_events,
    headless_exec,
    headless_sessions,
    headless_snapshot,
    headless_status,
    headless_wait,
)
from ._shared.arguments import (
    add_json_argument,
    add_setup_arguments,
    add_workspace_argument,
)
from .attach.command import run as attach_run
from .resume.command import run as resume_run
from .start.command import run as start_run
from .web.command import run as web_run


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="situ")
    subparsers = parser.add_subparsers(dest="command", required=True)

    start_parser = subparsers.add_parser("start", help="start the local TUI")
    add_workspace_argument(start_parser)
    add_setup_arguments(start_parser)

    resume_parser = subparsers.add_parser("resume", help="resume an existing session in the TUI")
    add_workspace_argument(resume_parser)
    resume_parser.add_argument(
        "--session-id",
        help="session id to resume; defaults to the latest local session",
    )
    resume_parser.add_argument(
        "--max-experiments",
        type=int,
        help="maximum number of additional experiments to run",
    )

    attach_parser = subparsers.add_parser("attach", help="attach the TUI to a running harness")
    add_workspace_argument(attach_parser)

    exec_parser = subparsers.add_parser("exec", help="run a headless local session")
    add_workspace_argument(exec_parser)
    add_json_argument(exec_parser)
    add_setup_arguments(exec_parser)
    exec_parser.add_argument(
        "--timeout",
        type=float,
        help="maximum seconds to wait for the session to close",
    )

    status_parser = subparsers.add_parser("status", help="print local harness status as JSON")
    add_workspace_argument(status_parser)
    add_json_argument(status_parser)

    snapshot_parser = subparsers.add_parser("snapshot", help="print current local state as JSON")
    add_workspace_argument(snapshot_parser)
    add_json_argument(snapshot_parser)

    sessions_parser = subparsers.add_parser("sessions", help="list local sessions as JSON")
    add_workspace_argument(sessions_parser)
    add_json_argument(sessions_parser)

    events_parser = subparsers.add_parser("events", help="print events as JSON Lines")
    add_workspace_argument(events_parser)
    add_json_argument(events_parser)
    events_parser.add_argument(
        "--follow",
        action="store_true",
        help="follow live events from the active local session",
    )

    wait_parser = subparsers.add_parser("wait", help="wait for the active session to close")
    add_workspace_argument(wait_parser)
    add_json_argument(wait_parser)
    wait_parser.add_argument(
        "--timeout",
        type=float,
        help="maximum seconds to wait for the session to close",
    )

    clear_parser = subparsers.add_parser("clear", help="clear local Situ state for a workspace")
    add_workspace_argument(clear_parser)
    add_json_argument(clear_parser)
    clear_parser.add_argument(
        "--force",
        action="store_true",
        help="terminate an active local harness before clearing state",
    )

    web_parser = subparsers.add_parser(
        "web",
        help="serve the local project home and attach-only web monitors",
    )
    web_parser.add_argument(
        "workspace",
        nargs="?",
        help="accepted for compatibility; the web monitor lists all local projects",
    )
    web_parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="host for the local web server",
    )
    web_parser.add_argument(
        "--port",
        type=int,
        default=0,
        help="port for the local web server; defaults to a free port",
    )
    web_parser.add_argument(
        "--rebuild",
        action="store_true",
        help="rebuild the browser app before serving",
    )

    args = parser.parse_args(argv)

    if args.command == "start":
        return start_run(args)
    if args.command == "resume":
        return resume_run(args)
    if args.command == "attach":
        return attach_run(args)
    if args.command == "exec":
        return headless_exec(args)
    if args.command == "status":
        return headless_status(args)
    if args.command == "snapshot":
        return headless_snapshot(args)
    if args.command == "sessions":
        return headless_sessions(args)
    if args.command == "events":
        return headless_events(args)
    if args.command == "wait":
        return headless_wait(args)
    if args.command == "clear":
        return headless_clear(args)
    if args.command == "web":
        return web_run(args)

    parser.error(f"unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
