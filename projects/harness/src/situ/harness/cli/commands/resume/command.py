from __future__ import annotations

import argparse

from .._shared.tui import launch_managed_tui


def run(args: argparse.Namespace) -> int:
    return launch_managed_tui(args=args, mode="resume")
