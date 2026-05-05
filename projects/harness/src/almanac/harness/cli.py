from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

from .headless import (
    apply_setup_env,
    headless_clear,
    headless_events,
    headless_exec,
    headless_snapshot,
    headless_status,
    headless_wait,
)
from .core.db.project_registry import upsert_project_registry
from .local_session import base_env, start_session_server, stop_process
from .paths import resolve_app_root, resolve_workspace
from .project_context import ProjectContext


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="almanac")
    subparsers = parser.add_subparsers(dest="command", required=True)

    start_parser = subparsers.add_parser("start", help="start the local TUI")
    add_workspace_argument(start_parser)
    add_setup_arguments(start_parser)

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
    if args.command == "exec":
        return headless_exec(args)
    if args.command == "status":
        return headless_status(args)
    if args.command == "snapshot":
        return headless_snapshot(args)
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
    app_root = resolve_app_root(Path(__file__))
    if app_root is None:
        print("could not find Almanac app root; set ALMANAC_APP_ROOT", file=sys.stderr)
        return 1

    workspace = resolve_workspace(Path.cwd(), args.workspace)
    if not workspace.is_dir():
        print(f"workspace does not exist or is not a directory: {workspace}", file=sys.stderr)
        return 1

    context = ProjectContext(workspace)
    upsert_project_registry(
        almanac_home=context.home,
        project_id=context.project_id,
        repo_path=context.repo_root,
    )

    env = base_env(app_root, workspace)
    apply_setup_env(env, args)

    session_process, session = start_session_server(app_root, workspace, env)
    env["ALMANAC_SESSION_URL"] = session["url"]
    env["ALMANAC_SESSION_TOKEN"] = session["token"]

    try:
        return subprocess.run(["bun", "run", "dev"], cwd=app_root / "projects" / "tui", env=env).returncode
    finally:
        stop_process(session_process)


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
