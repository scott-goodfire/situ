from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

from .paths import resolve_app_root, resolve_workspace


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
    start_parser.add_argument("--goal", help="initial goal for first-time setup")
    start_parser.add_argument(
        "--evaluation-context",
        help="plain-language description of evals, tools, metrics, logs, or artifacts",
    )
    start_parser.add_argument(
        "--known-signal",
        action="append",
        dest="known_signals",
        help="expected signal key; repeat for multiple signals",
    )
    start_parser.add_argument(
        "--experiment-scope",
        help="plain-language description of the experiments that are in scope",
    )
    start_parser.add_argument(
        "--max-experiments",
        type=int,
        help="maximum number of non-baseline experiments to run",
    )
    args = parser.parse_args()

    if args.command == "start":
        return start(args)

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

    env = os.environ.copy()
    env["ALMANAC_APP_ROOT"] = str(app_root)
    env["ALMANAC_WORKSPACE"] = str(workspace)

    optional_env = {
        "ALMANAC_EVAL_COMMAND": args.eval_command,
        "ALMANAC_GOAL": args.goal,
        "ALMANAC_EVALUATION_CONTEXT": args.evaluation_context,
        "ALMANAC_EXPERIMENT_SCOPE": args.experiment_scope,
        "ALMANAC_MAX_EXPERIMENTS": str(args.max_experiments) if args.max_experiments is not None else None,
    }
    for key, value in optional_env.items():
        if value:
            env[key] = value
    if args.known_signals:
        env["ALMANAC_KNOWN_SIGNALS"] = ",".join(args.known_signals)

    return subprocess.run(["bun", "run", "dev"], cwd=app_root / "projects" / "tui", env=env).returncode


if __name__ == "__main__":
    raise SystemExit(main())
