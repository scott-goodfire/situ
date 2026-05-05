from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

from ..core.db.project_registry import upsert_project_registry
from ..core.paths import resolve_app_root, resolve_workspace
from ..core.project_context import ProjectContext
from .headless import (
    apply_session_env,
    headless_clear,
    headless_events,
    headless_exec,
    headless_sessions,
    headless_snapshot,
    headless_status,
    headless_wait,
)
from .local_session import base_env, read_live_session, start_session_server, stop_process


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="almanac")
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

    clear_parser = subparsers.add_parser("clear", help="clear local Almanac state for a workspace")
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
        return start(args)
    if args.command == "resume":
        return resume(args)
    if args.command == "attach":
        return attach(args)
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
        return web(args)

    parser.error(f"unknown command: {args.command}")
    return 2


def add_workspace_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "workspace",
        nargs="?",
        help="workspace/repo to observe; defaults to the current directory",
    )


def add_json_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--json",
        action="store_true",
        help="accepted for agent CLI compatibility; output is always JSON/JSONL",
    )


def add_setup_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--objective", help="initial objective for first-time setup")
    parser.add_argument(
        "--context",
        help="plain-language project/run context: how to evaluate, what outputs mean, and what must not break",
    )
    parser.add_argument(
        "--max-experiments",
        type=int,
        help="maximum number of experiments to run",
    )


def start(args: argparse.Namespace) -> int:
    return launch_managed_tui(args=args, mode="start")


def resume(args: argparse.Namespace) -> int:
    return launch_managed_tui(args=args, mode="resume")


def attach(args: argparse.Namespace) -> int:
    app_root = resolve_app_root(Path(__file__))
    if app_root is None:
        print("could not find Almanac app root; set ALMANAC_APP_ROOT", file=sys.stderr)
        return 1

    workspace = resolve_workspace(Path.cwd(), args.workspace)
    if not workspace.is_dir():
        print(f"workspace does not exist or is not a directory: {workspace}", file=sys.stderr)
        return 1

    session = read_live_session(workspace)
    if session is None:
        print("no active Almanac harness found for this workspace", file=sys.stderr)
        return 1

    env = base_env(app_root, workspace)
    env["ALMANAC_SESSION_MODE"] = "attach"
    env["ALMANAC_SESSION_URL"] = session["url"]
    env["ALMANAC_SESSION_TOKEN"] = session["token"]
    return run_tui(app_root=app_root, env=env)


def launch_managed_tui(
    *,
    args: argparse.Namespace,
    mode: str,
) -> int:
    app_root = resolve_app_root(Path(__file__))
    if app_root is None:
        print("could not find Almanac app root; set ALMANAC_APP_ROOT", file=sys.stderr)
        return 1

    workspace = resolve_workspace(Path.cwd(), args.workspace)
    if not workspace.is_dir():
        print(f"workspace does not exist or is not a directory: {workspace}", file=sys.stderr)
        return 1

    if read_live_session(workspace) is not None:
        print(
            "active Almanac harness found for this workspace; use almanac attach or stop it first",
            file=sys.stderr,
        )
        return 1

    context = ProjectContext(workspace)
    upsert_project_registry(
        almanac_home=context.home,
        project_id=context.project_id,
        repo_path=context.repo_root,
    )

    env = base_env(app_root, workspace)
    apply_session_env(env, args)
    env["ALMANAC_SESSION_MODE"] = mode

    session_process, session = start_session_server(app_root, workspace, env)
    env["ALMANAC_SESSION_URL"] = session["url"]
    env["ALMANAC_SESSION_TOKEN"] = session["token"]

    try:
        return run_tui(app_root=app_root, env=env)
    finally:
        stop_process(session_process)


def run_tui(
    *,
    app_root: Path,
    env: dict[str, str],
) -> int:
    return subprocess.run(
        ["bun", "run", "dev"],
        cwd=app_root / "projects" / "tui",
        env=env,
    ).returncode


def web(args: argparse.Namespace) -> int:
    app_root = resolve_app_root(Path(__file__))
    if app_root is None:
        print("could not find Almanac app root; set ALMANAC_APP_ROOT", file=sys.stderr)
        return 1

    env = os.environ.copy()
    env["ALMANAC_APP_ROOT"] = str(app_root)
    env.pop("ALMANAC_WORKSPACE", None)

    web_root = app_root / "projects" / "web"
    if should_build_web(web_root, rebuild=args.rebuild):
        build = subprocess.run(
            ["bun", "run", "build"],
            cwd=web_root,
            env=env,
        )
        if build.returncode != 0:
            return build.returncode

    return subprocess.run(
        [
            "bun",
            "run",
            "serve",
            "--",
            "--host",
            args.host,
            "--port",
            str(args.port),
        ],
        cwd=web_root,
        env=env,
    ).returncode


def should_build_web(web_root: Path, *, rebuild: bool) -> bool:
    return rebuild or not (web_root / "dist" / "index.html").is_file()


if __name__ == "__main__":
    raise SystemExit(main())
