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
    add_setup_arguments,
    add_workspace_argument,
)
from ...core.install_info import install_info
from .apply.command import run as apply_run
from .app.command import run as app_run
from .attach.command import run as attach_run
from .completions.command import run as completions_run
from .doctor.command import run as doctor_run
from .patches.command import run as patches_run
from .resume.command import run as resume_run
from .secrets.command import run as secrets_run
from .self.command import run as self_run
from .tui.command import LATEST_SENTINEL, run as tui_run
from .version.command import format_one_line, run as version_run
from .web.command import run as web_run


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="situ")
    parser.add_argument(
        "-v",
        "--version",
        action="version",
        version=format_one_line(install_info()),
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    app_parser = subparsers.add_parser("app", help="run the local Situ app server")
    app_parser.add_argument(
        "--force",
        action="store_true",
        help="start a new app server even when a healthy app record exists",
    )

    secrets_parser = subparsers.add_parser(
        "secrets",
        help="manage local runtime secrets",
    )
    secrets_subparsers = secrets_parser.add_subparsers(
        dest="secrets_command",
        required=True,
    )

    secrets_status_parser = secrets_subparsers.add_parser(
        "status",
        help="show redacted local runtime secret status",
    )
    add_machine_json_argument(secrets_status_parser)

    secrets_set_parser = secrets_subparsers.add_parser(
        "set",
        help="prompt for and save a local runtime secret",
    )
    secrets_set_parser.add_argument("secret_name", choices=("anthropic", "logfire"))
    add_machine_json_argument(secrets_set_parser)

    secrets_unset_parser = secrets_subparsers.add_parser(
        "unset",
        help="remove one local runtime secret",
    )
    secrets_unset_parser.add_argument("secret_name", choices=("anthropic", "logfire"))
    add_machine_json_argument(secrets_unset_parser)

    secrets_clear_parser = secrets_subparsers.add_parser(
        "clear",
        help="remove all local runtime secrets",
    )
    add_machine_json_argument(secrets_clear_parser)

    tui_parser = subparsers.add_parser("tui", help="open the TUI over the local app")
    add_workspace_argument(tui_parser)
    add_setup_arguments(tui_parser)
    tui_mode = tui_parser.add_mutually_exclusive_group()
    tui_mode.add_argument(
        "--resume",
        nargs="?",
        const=LATEST_SENTINEL,
        help="resume an existing session id; defaults to the latest local session for the workspace",
    )
    tui_mode.add_argument(
        "--attach",
        action="store_true",
        help="attach without starting or resuming a session",
    )

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

    attach_parser = subparsers.add_parser("attach", help="attach the TUI through the local app")
    add_workspace_argument(attach_parser)

    exec_parser = subparsers.add_parser("exec", help="run a headless local session")
    add_workspace_argument(exec_parser)
    add_setup_arguments(exec_parser)
    exec_parser.add_argument(
        "--resume",
        nargs="?",
        const=LATEST_SENTINEL,
        help=(
            "resume an existing session id headlessly; defaults to the latest "
            "local session for the workspace"
        ),
    )
    exec_parser.add_argument(
        "--timeout",
        type=float,
        help="maximum seconds to wait for the session to close",
    )

    status_parser = subparsers.add_parser("status", help="print local harness status as JSON")
    add_workspace_argument(status_parser)

    snapshot_parser = subparsers.add_parser("snapshot", help="print current local state as JSON")
    add_workspace_argument(snapshot_parser)

    sessions_parser = subparsers.add_parser("sessions", help="list local sessions as JSON")
    add_workspace_argument(sessions_parser)

    events_parser = subparsers.add_parser("events", help="print events as JSON Lines")
    add_workspace_argument(events_parser)
    events_parser.add_argument(
        "--follow",
        action="store_true",
        help="follow live events from the active local session",
    )

    patches_parser = subparsers.add_parser("patches", help="list local patch artifacts")
    add_workspace_argument(patches_parser)
    add_machine_json_argument(patches_parser)

    apply_parser = subparsers.add_parser("apply", help="apply a Situ patch artifact")
    apply_parser.add_argument("artifact_id", help="patch artifact id, such as ART3")
    add_workspace_argument(apply_parser)
    apply_parser.add_argument(
        "--branch",
        nargs="?",
        const="",
        help="create a branch before applying; defaults to situ/apply/<artifact-id>",
    )
    apply_parser.add_argument(
        "--force",
        action="store_true",
        help="allow applying when the checkout is dirty",
    )

    wait_parser = subparsers.add_parser("wait", help="wait for the active session to close")
    add_workspace_argument(wait_parser)
    wait_parser.add_argument(
        "--timeout",
        type=float,
        help="maximum seconds to wait for the session to close",
    )

    clear_parser = subparsers.add_parser("clear", help="clear local Situ state for a workspace")
    add_workspace_argument(clear_parser)
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

    version_parser = subparsers.add_parser("version", help="print the situ version")
    add_machine_json_argument(version_parser)

    self_parser = subparsers.add_parser("self", help="manage the situ install")
    self_subparsers = self_parser.add_subparsers(dest="self_command", required=True)

    self_update_parser = self_subparsers.add_parser(
        "update",
        help="update situ to the latest release",
    )
    self_update_parser.add_argument(
        "version",
        nargs="?",
        default=None,
        help="release tag to install (default: latest)",
    )

    self_uninstall_parser = self_subparsers.add_parser(
        "uninstall",
        help="remove the situ install (preserves ~/.situ/ product state)",
    )
    self_uninstall_parser.add_argument(
        "--yes",
        action="store_true",
        help="skip the confirmation prompt",
    )

    doctor_parser = subparsers.add_parser(
        "doctor",
        help="report install diagnostics",
    )
    add_machine_json_argument(doctor_parser)

    completions_parser = subparsers.add_parser(
        "completions",
        help="emit shell completion script",
    )
    completions_parser.add_argument(
        "shell",
        choices=("bash", "zsh", "fish"),
        help="target shell",
    )

    args = parser.parse_args(argv)

    if args.command == "app":
        return app_run(args)
    if args.command == "secrets":
        return secrets_run(args)
    if args.command == "tui":
        return tui_run(args)
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
    if args.command == "patches":
        return patches_run(args)
    if args.command == "apply":
        return apply_run(args)
    if args.command == "wait":
        return headless_wait(args)
    if args.command == "clear":
        return headless_clear(args)
    if args.command == "web":
        return web_run(args)
    if args.command == "version":
        return version_run(args)
    if args.command == "self":
        return self_run(args)
    if args.command == "doctor":
        return doctor_run(args)
    if args.command == "completions":
        return completions_run(args)

    parser.error(f"unknown command: {args.command}")
    return 2


def add_machine_json_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--json",
        action="store_true",
        help="print machine-readable JSON",
    )


if __name__ == "__main__":
    raise SystemExit(main())
