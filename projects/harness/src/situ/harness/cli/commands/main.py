from __future__ import annotations

import argparse

from ._shared.arguments import (
    add_setup_arguments,
    add_workspace_argument,
)
from ._shared.parser import SituArgumentParser
from ._shared.sessions import LATEST_SENTINEL
from ...core.install_info import install_info
from .version.command import format_one_line


def main(argv: list[str] | None = None) -> int:
    parser = SituArgumentParser(prog="situ")
    parser.add_argument(
        "-v",
        "--version",
        action="version",
        version=format_one_line(install_info()),
    )
    subparsers = parser.add_subparsers(
        dest="command",
        required=True,
        parser_class=SituArgumentParser,
    )

    app_parser = subparsers.add_parser("app", help="run the local Situ app server")
    app_parser.add_argument(
        "--force",
        action="store_true",
        help="start a new app server even when a healthy app record exists",
    )
    app_parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="host for the local app server",
    )
    app_parser.add_argument(
        "--port",
        type=int,
        default=0,
        help="port for the local app server; defaults to a free port",
    )
    app_parser.add_argument(
        "--rebuild-web",
        action="store_true",
        help="rebuild the browser app before serving it from the app server",
    )

    secrets_parser = subparsers.add_parser(
        "secrets",
        help="manage local runtime secrets",
    )
    secrets_subparsers = secrets_parser.add_subparsers(
        dest="secrets_command",
        required=True,
        parser_class=SituArgumentParser,
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
        help="open an existing session id for explicit resume confirmation; defaults to the latest local session for the workspace",
    )

    resume_parser = subparsers.add_parser(
        "resume",
        help="open an existing session in the TUI for explicit resume confirmation",
    )
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
        help="resolve the app-hosted project home and read-only web monitors",
    )
    web_parser.add_argument(
        "--host",
        default="127.0.0.1",
        help=argparse.SUPPRESS,
    )
    web_parser.add_argument(
        "--port",
        type=int,
        default=0,
        help=argparse.SUPPRESS,
    )
    web_parser.add_argument(
        "--rebuild",
        action="store_true",
        help=argparse.SUPPRESS,
    )

    version_parser = subparsers.add_parser("version", help="print the situ version")
    add_machine_json_argument(version_parser)

    self_parser = subparsers.add_parser("self", help="manage the situ install")
    self_subparsers = self_parser.add_subparsers(
        dest="self_command",
        required=True,
        parser_class=SituArgumentParser,
    )

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

    compute_parser = subparsers.add_parser(
        "compute",
        help="manage local compute targets that gate Scientist work",
    )
    compute_subparsers = compute_parser.add_subparsers(
        dest="compute_command",
        required=True,
        parser_class=SituArgumentParser,
    )

    compute_add_parser = compute_subparsers.add_parser(
        "add",
        help="register a local compute target",
    )
    compute_add_parser.add_argument(
        "--pool",
        required=True,
        help="pool label this target joins (e.g. local)",
    )
    compute_add_parser.add_argument(
        "--label",
        default=None,
        help="optional human-readable label",
    )
    compute_add_parser.add_argument(
        "--metadata-json",
        default=None,
        help="optional JSON object stored on the target row",
    )
    compute_add_parser.add_argument(
        "--cuda-visible-devices",
        default=None,
        help=(
            "optional CUDA_VISIBLE_DEVICES value for Scientist commands that "
            "lease this local target"
        ),
    )
    add_machine_json_argument(compute_add_parser)

    compute_list_parser = compute_subparsers.add_parser(
        "list",
        help="list registered compute targets",
    )
    add_machine_json_argument(compute_list_parser)

    compute_remove_parser = compute_subparsers.add_parser(
        "remove",
        help="remove a compute target",
    )
    compute_remove_parser.add_argument(
        "target_id",
        help="compute target id, such as CT1",
    )
    compute_remove_parser.add_argument(
        "--force",
        action="store_true",
        help="remove even when the target is currently claimed",
    )
    add_machine_json_argument(compute_remove_parser)

    args = parser.parse_args(argv)
    return _dispatch(args, parser)


def _dispatch(args: argparse.Namespace, parser: argparse.ArgumentParser) -> int:
    command = args.command
    if command == "app":
        from .app.command import run
        return run(args)
    if command == "secrets":
        from .secrets.command import run
        return run(args)
    if command == "tui":
        from .tui.command import run
        return run(args)
    if command == "resume":
        from .resume.command import run
        return run(args)
    if command == "exec":
        from ..headless.exec.command import run
        return run(args)
    if command == "status":
        from ..headless.status.command import run
        return run(args)
    if command == "snapshot":
        from ..headless.snapshot.command import run
        return run(args)
    if command == "sessions":
        from ..headless.sessions.command import run
        return run(args)
    if command == "events":
        from ..headless.events.command import run
        return run(args)
    if command == "patches":
        from .patches.command import run
        return run(args)
    if command == "apply":
        from .apply.command import run
        return run(args)
    if command == "wait":
        from ..headless.wait.command import run
        return run(args)
    if command == "clear":
        from ..headless.clear.command import run
        return run(args)
    if command == "web":
        from .web.command import run
        return run(args)
    if command == "version":
        from .version.command import run
        return run(args)
    if command == "self":
        from .self.command import run
        return run(args)
    if command == "doctor":
        from .doctor.command import run
        return run(args)
    if command == "completions":
        from .completions.command import run
        return run(args)
    if command == "compute":
        from .compute.command import run
        return run(args)

    parser.error(f"unknown command: {command}")
    return 2


def add_machine_json_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--json",
        action="store_true",
        help="print machine-readable JSON",
    )


if __name__ == "__main__":
    raise SystemExit(main())
