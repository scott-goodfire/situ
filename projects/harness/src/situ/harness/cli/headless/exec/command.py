from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from ..._shared import apply_session_env
from ...local_session import base_env, start_session_server, stop_process
from ....core.paths import resolve_app_root
from ...commands.tui.command import LATEST_SENTINEL
from .._shared.output import error_message, write_json
from .._shared.rpc import rpc_request
from .._shared.timing import is_deadline_expired, latest_record, timeout_deadline
from .._shared.workspace import (
    max_experiments,
    resolve_existing_workspace,
    session_start_params,
)


def run(args: argparse.Namespace) -> int:
    app_root = resolve_app_root(Path(__file__))

    workspace = resolve_existing_workspace(args)
    if workspace is None:
        return 1

    env = base_env(app_root, workspace)
    apply_session_env(env, args)

    session_process: subprocess.Popen[bytes] | None = None
    session_id = None

    try:
        session_process, session = start_session_server(
            workspace,
            env,
            quiet=True,
        )
        start_result = start_or_resume_session(
            session=session,
            args=args,
            workspace=workspace,
        )
        session_id = str(start_result["session_id"])
        action = "resumed" if getattr(args, "resume", None) else "started"
        print(f"{action} {session_id}", file=sys.stderr)

        wait_result = wait_for_rpc_session_to_close(
            session=session,
            session_id=session_id,
            timeout_seconds=args.timeout,
        )
        final_status = final_session_status(
            session_id=session_id,
            snapshot=wait_result["snapshot"],
        )
        write_json(
            {
                "workspace": str(workspace),
                "status": final_status,
                "session_id": session_id,
                "session": wait_result["session"],
                "snapshot": wait_result["snapshot"],
            }
        )
        return 1 if final_status == "failed" else 0
    except TimeoutError:
        write_json(
            {
                "workspace": str(workspace),
                "status": "timeout",
                "session_id": session_id,
            }
        )
        return 124
    except KeyboardInterrupt:
        write_json(
            {
                "workspace": str(workspace),
                "status": "interrupted",
                "session_id": session_id,
            }
        )
        return 130
    except Exception as error:
        print(error_message(error), file=sys.stderr)
        return 1
    finally:
        if session_process is not None:
            stop_process(session_process)


def start_or_resume_session(
    *,
    session: dict[str, str],
    args: argparse.Namespace,
    workspace: Path,
) -> dict[str, Any]:
    resume = getattr(args, "resume", None)
    if resume is not None:
        session_id = (
            latest_session_id(session=session)
            if resume == LATEST_SENTINEL
            else str(resume)
        )
        return rpc_request(
            session,
            "session.resume",
            {
                "session_id": session_id,
                "max_experiments": max_experiments(args),
            },
        )

    return rpc_request(
        session,
        "session.start",
        session_start_params(
            args=args,
            workspace=workspace,
        ),
    )


def latest_session_id(*, session: dict[str, str]) -> str:
    snapshot = rpc_request(session, "collections.bootstrap", {})
    latest = latest_record(snapshot.get("sessions", []))
    if latest is None:
        raise RuntimeError("no local session found to resume")
    session_id = latest.get("id")
    if not isinstance(session_id, str) or not session_id:
        raise RuntimeError("latest local session has no id")
    return session_id


def wait_for_rpc_session_to_close(
    *,
    session: dict[str, str],
    session_id: str,
    timeout_seconds: float | None,
) -> dict[str, Any]:
    deadline = timeout_deadline(timeout_seconds)

    while True:
        status = rpc_request(session, "session.status", {"session_id": session_id})
        session_record = status.get("session")
        if isinstance(session_record, dict) and session_record.get("status") == "closed":
            snapshot = rpc_request(session, "collections.bootstrap", {})
            return {
                "session": session_record,
                "snapshot": snapshot,
            }

        if is_deadline_expired(deadline):
            raise TimeoutError(f"timed out waiting for {session_id}")

        time.sleep(0.5)


def final_session_status(*, session_id: str, snapshot: dict[str, Any]) -> str:
    for event in snapshot.get("events", []):
        if not isinstance(event, dict):
            continue
        if (
            event.get("associated_session_id") == session_id
            and event.get("type") == "session.failed"
        ):
            return "failed"
    return "completed"
