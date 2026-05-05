from __future__ import annotations

import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

from .project_context import ProjectContext


def base_env(app_root: Path, workspace: Path) -> dict[str, str]:
    env = os.environ.copy()
    env["ALMANAC_APP_ROOT"] = str(app_root)
    env["ALMANAC_WORKSPACE"] = str(workspace)
    return env


def start_session_server(
    app_root: Path,
    workspace: Path,
    env: dict[str, str],
    *,
    quiet: bool = False,
) -> tuple[subprocess.Popen[bytes], dict[str, str]]:
    path = session_path(workspace)
    path.unlink(missing_ok=True)
    stdout = subprocess.DEVNULL if quiet else None
    process = subprocess.Popen(
        ["bun", "run", "dev"],
        cwd=app_root / "projects" / "session-server",
        env=env,
        stdout=stdout,
    )
    try:
        return process, wait_for_session(path, process)
    except Exception:
        stop_process(process)
        raise


def wait_for_session(path: Path, process: subprocess.Popen[bytes]) -> dict[str, str]:
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"session server exited with code {process.returncode}")
        if path.exists():
            session = json.loads(path.read_text())
            if ping_session(session):
                return session
        time.sleep(0.05)
    raise TimeoutError("timed out waiting for Almanac session server")


def read_live_session(workspace: Path) -> dict[str, str] | None:
    session = read_session_record(workspace)
    if session is None:
        return None
    return session if ping_session(session) else None


def read_session_record(workspace: Path) -> dict[str, str] | None:
    path = session_path(workspace)
    if not path.exists():
        return None
    try:
        session = json.loads(path.read_text())
    except json.JSONDecodeError:
        return None
    if not isinstance(session, dict):
        return None
    return session


def session_path(workspace: Path) -> Path:
    return ProjectContext(workspace).project_dir / "session.json"


def ping_session(session: dict[str, str]) -> bool:
    try:
        request = urllib.request.Request(
            f"{session['url']}/health",
            headers={"Authorization": f"Bearer {session['token']}"},
        )
        with urllib.request.urlopen(request, timeout=1) as response:
            return response.status == 200
    except (KeyError, TimeoutError, OSError, urllib.error.URLError):
        return False


def stop_process(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)
