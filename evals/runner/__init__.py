from __future__ import annotations


def main(argv: list[str] | None = None) -> int:
    from evals.runner.cli import main as run_main

    return run_main(argv)

__all__ = ["main"]
