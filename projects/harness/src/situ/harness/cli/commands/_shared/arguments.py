from __future__ import annotations

import argparse


def add_workspace_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "workspace",
        nargs="?",
        help="workspace/repo to observe; defaults to the current directory",
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
