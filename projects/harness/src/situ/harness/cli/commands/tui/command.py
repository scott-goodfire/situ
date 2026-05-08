from __future__ import annotations

import argparse

from .._shared.sessions import LATEST_SENTINEL
from .._shared.tui import launch_app_tui


def run(args: argparse.Namespace) -> int:
    resume = getattr(args, "resume", None)
    if resume is not None:
        if resume != LATEST_SENTINEL:
            args.session_id = resume
        return launch_app_tui(args=args, mode="resume")

    return launch_app_tui(args=args, mode="start")
