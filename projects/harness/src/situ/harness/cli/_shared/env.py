from __future__ import annotations

import argparse


def apply_session_env(env: dict[str, str], args: argparse.Namespace) -> None:
    max_count = getattr(args, "max_experiments", None)
    optional_env = {
        "SITU_OBJECTIVE": getattr(args, "objective", None),
        "SITU_CONTEXT": getattr(args, "context", None),
        "SITU_RESUME_SESSION_ID": getattr(args, "session_id", None),
    }
    if max_count is not None:
        optional_env["SITU_MAX_EXPERIMENTS"] = str(max_count)

    for key, value in optional_env.items():
        if value:
            env[key] = value
