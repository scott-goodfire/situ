from __future__ import annotations

import argparse

from .._shared.tui import launch_app_tui


def run(args: argparse.Namespace) -> int:
    return launch_app_tui(args=args, mode="resume")
