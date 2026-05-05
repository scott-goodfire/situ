from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from .paths import resolve_app_root, resolve_workspace
from .project_context import ProjectContext


def main() -> int:
    parser = argparse.ArgumentParser(prog="almanac")
    subparsers = parser.add_subparsers(dest="command", required=True)
    start_parser = subparsers.add_parser("start", help="start the local TUI")
    start_parser.add_argument(
        "workspace",
        nargs="?",
        help="workspace/repo to observe; defaults to the current directory",
    )
    start_parser.add_argument(
        "--eval-command",
        help="command the built-in local command worker should run for each experiment",
    )
    start_parser.add_argument("--objective", help="initial objective for first-time setup")
    start_parser.add_argument(
        "--research-context",
        help="plain-language description of evals, tools, metrics, logs, artifacts, and scope",
    )
    start_parser.add_argument(
        "--evaluation-context",
        help="deprecated alias folded into --research-context",
    )
    start_parser.add_argument(
        "--known-signal",
        action="append",
        dest="known_signals",
        help="optional expected signal key folded into research context; repeat for multiple signals",
    )
    start_parser.add_argument(
        "--experiment-scope",
        help="deprecated scope hint folded into --research-context",
    )
    start_parser.add_argument(
        "--max-experiments",
        type=int,
        help="maximum number of experiments to run",
    )
    web_parser = subparsers.add_parser("web", help="open the attach-only web monitor")
    web_parser.add_argument(
        "workspace",
        nargs="?",
        help="workspace/repo to observe; defaults to the current directory",
    )
    args = parser.parse_args()

    if args.command == "start":
        return start(args)
    if args.command == "web":
        return web(args)

    parser.error(f"unknown command: {args.command}")
    return 2


def start(args: argparse.Namespace) -> int:
    app_root = resolve_app_root(Path(__file__))
    if app_root is None:
        print("could not find Almanac app root; set ALMANAC_APP_ROOT", file=sys.stderr)
        return 1

    workspace = resolve_workspace(Path.cwd(), args.workspace)
    if not workspace.is_dir():
        print(f"workspace does not exist or is not a directory: {workspace}", file=sys.stderr)
        return 1

    env = base_env(app_root, workspace)

    optional_env = {
        "ALMANAC_EVAL_COMMAND": args.eval_command,
        "ALMANAC_OBJECTIVE": args.objective,
        "ALMANAC_RESEARCH_CONTEXT": args.research_context,
        "ALMANAC_EVALUATION_CONTEXT": args.evaluation_context,
        "ALMANAC_EXPERIMENT_SCOPE": args.experiment_scope,
        "ALMANAC_MAX_EXPERIMENTS": str(args.max_experiments) if args.max_experiments is not None else None,
    }
    for key, value in optional_env.items():
        if value:
            env[key] = value
    if args.known_signals:
        env["ALMANAC_KNOWN_SIGNALS"] = ",".join(args.known_signals)

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

    workspace = resolve_workspace(Path.cwd(), args.workspace)
    if not workspace.is_dir():
        print(f"workspace does not exist or is not a directory: {workspace}", file=sys.stderr)
        return 1

    env = base_env(app_root, workspace)
    session = read_live_session(workspace)
    env["VITE_ALMANAC_WORKSPACE"] = str(workspace)
    if session is not None:
        env["VITE_ALMANAC_SESSION_URL"] = session["url"]
        env["VITE_ALMANAC_SESSION_TOKEN"] = session["token"]

    return subprocess.run(["bun", "run", "dev"], cwd=app_root / "projects" / "web", env=env).returncode


def base_env(app_root: Path, workspace: Path) -> dict[str, str]:
    env = os.environ.copy()
    env["ALMANAC_APP_ROOT"] = str(app_root)
    env["ALMANAC_WORKSPACE"] = str(workspace)
    return env


def start_session_server(
    app_root: Path,
    workspace: Path,
    env: dict[str, str],
) -> tuple[subprocess.Popen[bytes], dict[str, str]]:
    path = session_path(workspace)
    path.unlink(missing_ok=True)
    process = subprocess.Popen(
        ["bun", "run", "dev"],
        cwd=app_root / "projects" / "session-server",
        env=env,
    )
    try:
        return process, wait_for_session(path, process)
    except Exception:
        stop_process(process)
        raise


def wait_for_session(path: Path, process: subprocess.Popen[bytes]) -> dict[str, str]:
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"session server exited with code {process.returncode}")
        if path.exists():
            session = json.loads(path.read_text())
            if ping_session(session):
                return session
        time.sleep(0.05)
    raise TimeoutError("timed out waiting for Almanac session server")


def read_live_session(workspace: Path) -> dict[str, str] | None:
    path = session_path(workspace)
    if not path.exists():
        return None
    try:
        session = json.loads(path.read_text())
    except json.JSONDecodeError:
        return None
    return session if ping_session(session) else None


def session_path(workspace: Path) -> Path:
    return ProjectContext(workspace).project_dir / "session.json"


def ping_session(session: dict[str, str]) -> bool:
    try:
        request = urllib.request.Request(
            f"{session['url']}/health",
            headers={"Authorization": f"Bearer {session['token']}"},
        )
        with urllib.request.urlopen(request, timeout=1) as response:
            return response.status == 200
    except (KeyError, TimeoutError, OSError, urllib.error.URLError):
        return False


def stop_process(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


if __name__ == "__main__":
    raise SystemExit(main())
