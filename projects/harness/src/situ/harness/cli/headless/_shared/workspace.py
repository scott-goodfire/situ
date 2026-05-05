from __future__ import annotations

import argparse
import os
import signal
import sys
import time
from pathlib import Path
from typing import Any

from ...local_session import ping_session
from ....core.paths import resolve_workspace

DEFAULT_MAX_EXPERIMENTS = 6


def resolve_existing_workspace(args: argparse.Namespace) -> Path | None:
    workspace = resolve_workspace(Path.cwd(), args.workspace)
    if workspace.is_dir():
        return workspace

    print(f"workspace does not exist or is not a directory: {workspace}", file=sys.stderr)
    return None


def terminate_live_session(*, session: dict[str, str]) -> None:
    raw_pid = session.get("pid")
    if raw_pid is None:
        raise RuntimeError("active harness has no pid; stop it before clearing state")

    pid = int(raw_pid)
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if not ping_session(session):
            return
        time.sleep(0.1)

    try:
        os.kill(pid, signal.SIGKILL)
    except ProcessLookupError:
        return
    deadline = time.monotonic() + 2
    while time.monotonic() < deadline:
        if not ping_session(session):
            return
        time.sleep(0.1)


def session_start_params(
    *,
    args: argparse.Namespace,
    workspace: Path,
) -> dict[str, Any]:
    objective = getattr(args, "objective", None)
    context = getattr(args, "context", None)

    if not objective:
        objective = f"Explore autoresearch opportunities in {workspace}"

    parts: list[str] = []
    if context:
        parts.append(context)
    parts.append(
        "Use project-native tools, tests, evals, benchmarks, logs, and artifacts. "
        "Capture plaintext evidence, useful interpretations, concerns, and activities."
    )

    return {
        "objective": objective,
        "research_context": " ".join(parts),
        "max_experiments": max_experiments(args),
    }


def max_experiments(args: argparse.Namespace) -> int:
    value = getattr(args, "max_experiments", None)
    if value is None:
        return DEFAULT_MAX_EXPERIMENTS
    if value < 0:
        return 0
    return value
