from __future__ import annotations

import subprocess


def current_git_sha() -> str:
    try:
        completed = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    except OSError:
        return "nogit"
    return completed.stdout.strip() or "nogit"
