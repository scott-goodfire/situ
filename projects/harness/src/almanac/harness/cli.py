from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(prog="almanac")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("start", help="start the local TUI")
    args = parser.parse_args()

    if args.command == "start":
        return start()

    parser.error(f"unknown command: {args.command}")
    return 2


def start() -> int:
    repo_root = find_repo_root(Path.cwd())
    if repo_root is None:
        print("almanac start must be run from the autoresearch-harness repo", file=sys.stderr)
        return 1

    return subprocess.run(["bun", "run", "dev"], cwd=repo_root / "projects" / "tui").returncode


def find_repo_root(start_dir: Path) -> Path | None:
    for candidate in [start_dir, *start_dir.parents]:
        if (candidate / "projects" / "tui").is_dir() and (candidate / "projects" / "harness").is_dir():
            return candidate
    return None


if __name__ == "__main__":
    raise SystemExit(main())
