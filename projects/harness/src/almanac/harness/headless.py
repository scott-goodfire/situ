from __future__ import annotations

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import time
from collections.abc import Iterator
from pathlib import Path
from typing import Any
import urllib.error
import urllib.parse
import urllib.request

from .app import HarnessApp
from .local_session import (
    base_env,
    ping_session,
    read_live_session,
    read_session_record,
    start_session_server,
    stop_process,
)
from .paths import resolve_app_root, resolve_workspace
from .project_context import ProjectContext

DEFAULT_MAX_EXPERIMENTS = 6


def headless_status(args: argparse.Namespace) -> int:
    workspace = resolve_existing_workspace(args)
    if workspace is None:
        return 1

    record = read_session_record(workspace)
    active = False
    session = None
    stale_session = None

    if record is not None and ping_session(record):
        active = True
        session = record
    elif record is not None:
        stale_session = record

    message = "active harness found" if active else "no active harness found"
    write_json(
        {
            "workspace": str(workspace),
            "active": active,
            "message": message,
            "session": session,
            "stale_session": stale_session,
        }
    )
    return 0


def headless_snapshot(args: argparse.Namespace) -> int:
    workspace = resolve_existing_workspace(args)
    if workspace is None:
        return 1

    try:
        source, snapshot = load_snapshot(workspace)
    except Exception as error:
        print(error_message(error), file=sys.stderr)
        return 1

    write_json(
        {
            "workspace": str(workspace),
            "source": source,
            "snapshot": snapshot,
        }
    )
    return 0


def headless_events(args: argparse.Namespace) -> int:
    workspace = resolve_existing_workspace(args)
    if workspace is None:
        return 1

    if args.follow:
        return follow_live_events(workspace)

    try:
        _source, snapshot = load_snapshot(workspace)
    except Exception as error:
        print(error_message(error), file=sys.stderr)
        return 1

    for event in snapshot.get("events", []):
        write_json_line({"type": "event", "event": event})
    return 0


def headless_sessions(args: argparse.Namespace) -> int:
    workspace = resolve_existing_workspace(args)
    if workspace is None:
        return 1

    try:
        source, snapshot = load_snapshot(workspace)
    except Exception as error:
        print(error_message(error), file=sys.stderr)
        return 1

    write_json(
        {
            "workspace": str(workspace),
            "source": source,
            "sessions": snapshot.get("sessions", []),
        }
    )
    return 0


def headless_wait(args: argparse.Namespace) -> int:
    workspace = resolve_existing_workspace(args)
    if workspace is None:
        return 1

    deadline = timeout_deadline(args.timeout)

    while True:
        live_session = read_live_session(workspace)
        try:
            source, snapshot = load_snapshot(workspace)
        except Exception as error:
            print(error_message(error), file=sys.stderr)
            return 1

        sessions = snapshot.get("sessions", [])
        active_sessions = [
            session for session in sessions if session.get("status") == "active"
        ]

        if not sessions:
            write_json(
                {
                    "workspace": str(workspace),
                    "completed": False,
                    "reason": "no_sessions",
                    "source": source,
                }
            )
            return 1

        if not active_sessions:
            write_json(
                {
                    "workspace": str(workspace),
                    "completed": True,
                    "source": source,
                    "session": latest_record(sessions),
                    "snapshot": snapshot,
                }
            )
            return 0

        if live_session is None:
            write_json(
                {
                    "workspace": str(workspace),
                    "completed": False,
                    "reason": "no_active_harness",
                    "active_sessions": active_sessions,
                    "source": source,
                }
            )
            return 1

        if is_deadline_expired(deadline):
            write_json(
                {
                    "workspace": str(workspace),
                    "completed": False,
                    "reason": "timeout",
                    "active_sessions": active_sessions,
                    "source": source,
                }
            )
            return 124

        time.sleep(0.5)


def headless_clear(args: argparse.Namespace) -> int:
    workspace = resolve_existing_workspace(args)
    if workspace is None:
        return 1

    live_session = read_live_session(workspace)
    force = bool(getattr(args, "force", False))
    context = ProjectContext(repo_root=workspace)

    if live_session is not None and not force:
        write_json(
            {
                "workspace": str(workspace),
                "project_id": context.project_id,
                "project_dir": str(context.project_dir),
                "cleared": False,
                "reason": "active_harness",
                "message": "active harness found; stop it first or rerun with --force",
                "session": live_session,
            }
        )
        return 1

    if live_session is not None:
        terminate_live_session(session=live_session)

    shutil.rmtree(context.project_dir, ignore_errors=True)
    write_json(
        {
            "workspace": str(workspace),
            "project_id": context.project_id,
            "project_dir": str(context.project_dir),
            "cleared": True,
        }
    )
    return 0


def headless_exec(args: argparse.Namespace) -> int:
    app_root = resolve_app_root(Path(__file__))
    if app_root is None:
        print("could not find Almanac app root; set ALMANAC_APP_ROOT", file=sys.stderr)
        return 1

    workspace = resolve_existing_workspace(args)
    if workspace is None:
        return 1

    env = base_env(app_root, workspace)
    apply_session_env(env, args)

    session_process: subprocess.Popen[bytes] | None = None
    session_id = None

    try:
        session_process, session = start_session_server(
            app_root,
            workspace,
            env,
            quiet=True,
        )
        start_result = rpc_request(
            session,
            "session.start",
            session_start_params(
                args=args,
                workspace=workspace,
            ),
        )
        session_id = str(start_result["session_id"])
        print(f"started {session_id}", file=sys.stderr)

        wait_result = wait_for_rpc_session_to_close(
            session=session,
            session_id=session_id,
            timeout_seconds=args.timeout,
        )
        write_json(
            {
                "workspace": str(workspace),
                "status": "completed",
                "session_id": session_id,
                "session": wait_result["session"],
                "snapshot": wait_result["snapshot"],
            }
        )
        return 0
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


def resolve_existing_workspace(args: argparse.Namespace) -> Path | None:
    workspace = resolve_workspace(Path.cwd(), args.workspace)
    if workspace.is_dir():
        return workspace

    print(f"workspace does not exist or is not a directory: {workspace}", file=sys.stderr)
    return None


def apply_session_env(env: dict[str, str], args: argparse.Namespace) -> None:
    max_count = getattr(args, "max_experiments", None)
    optional_env = {
        "ALMANAC_OBJECTIVE": getattr(args, "objective", None),
        "ALMANAC_CONTEXT": getattr(args, "context", None),
        "ALMANAC_RESUME_SESSION_ID": getattr(args, "session_id", None),
    }
    if max_count is not None:
        optional_env["ALMANAC_MAX_EXPERIMENTS"] = str(max_count)

    for key, value in optional_env.items():
        if value:
            env[key] = value


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


def load_snapshot(workspace: Path) -> tuple[str, dict[str, Any]]:
    live_session = read_live_session(workspace)
    if live_session is not None:
        return "live", rpc_request(live_session, "collections.bootstrap", {})

    app = HarnessApp(
        workspace,
        app_root=resolve_app_root(Path(__file__)),
        notify=lambda _method, _params: None,
    )
    return "local", app.collections_bootstrap({})


def follow_live_events(workspace: Path) -> int:
    session = read_live_session(workspace)
    if session is None:
        write_json(
            {
                "workspace": str(workspace),
                "error": "no_active_harness",
                "message": "no active harness found",
            }
        )
        return 1

    try:
        with open_event_stream(session) as response:
            rpc_request(session, "events.subscribe", {"replay_existing": True})
            for notification in iter_sse_notifications(response):
                write_notification(notification)
    except KeyboardInterrupt:
        return 130
    except Exception as error:
        print(error_message(error), file=sys.stderr)
        return 1
    return 0


def open_event_stream(session: dict[str, str]) -> Any:
    query = urllib.parse.urlencode({"token": session["token"]})
    request = urllib.request.Request(
        f"{session['url']}/events?{query}",
        headers={"Authorization": f"Bearer {session['token']}"},
    )
    return urllib.request.urlopen(request)


def iter_sse_notifications(response: Any) -> Iterator[dict[str, Any]]:
    data_lines: list[str] = []
    for raw_line in response:
        line = raw_line.decode("utf-8").rstrip("\r\n")
        if line:
            if line.startswith("data:"):
                data_lines.append(line[len("data:") :].lstrip())
            continue

        if not data_lines:
            continue

        data = "\n".join(data_lines)
        data_lines = []
        try:
            notification = json.loads(data)
        except json.JSONDecodeError:
            continue

        if isinstance(notification, dict) and notification.get("method"):
            yield notification


def write_notification(notification: dict[str, Any]) -> None:
    params = notification.get("params")
    if notification.get("method") == "event.appended" and isinstance(params, dict):
        event = params.get("event")
        if event is not None:
            write_json_line({"type": "event", "event": event})
            return

    write_json_line({"type": "notification", "notification": notification})


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


def timeout_deadline(timeout_seconds: float | None) -> float | None:
    if timeout_seconds is None:
        return None
    if timeout_seconds <= 0:
        return time.monotonic()
    return time.monotonic() + timeout_seconds


def is_deadline_expired(deadline: float | None) -> bool:
    if deadline is None:
        return False
    return time.monotonic() >= deadline


def latest_record(records: list[Any]) -> Any:
    if not records:
        return None
    return records[-1]


def rpc_request(
    session: dict[str, str],
    method: str,
    params: dict[str, Any] | None = None,
    *,
    timeout: float = 10,
) -> dict[str, Any]:
    body = json.dumps({"method": method, "params": params or {}}).encode("utf-8")
    request = urllib.request.Request(
        f"{session['url']}/rpc",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {session['token']}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"RPC {method} failed with HTTP {error.code}: {detail}") from error

    if payload.get("error"):
        error = payload["error"]
        if isinstance(error, dict):
            raise RuntimeError(str(error.get("message", error)))
        raise RuntimeError(str(error))

    result = payload.get("result")
    if isinstance(result, dict):
        return result
    return {}


def write_json(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, sort_keys=True))
    sys.stdout.write("\n")
    sys.stdout.flush()


def write_json_line(payload: dict[str, Any]) -> None:
    write_json(payload)


def error_message(error: Exception) -> str:
    if isinstance(error, RuntimeError):
        return str(error)
    return f"{type(error).__name__}: {error}"
