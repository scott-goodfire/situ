from __future__ import annotations

import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

from ..config import DEFAULTS
from ..core.project_context import ProjectContext


def base_env(app_root: Path, workspace: Path | None = None) -> dict[str, str]:
    env = os.environ.copy()
    env["SITU_APP_ROOT"] = str(app_root)
    if workspace is not None:
        env["SITU_WORKSPACE"] = str(workspace)
    else:
        env.pop("SITU_WORKSPACE", None)
    return env


def start_app_server(
    app_root: Path,
    env: dict[str, str],
    *,
    quiet: bool = False,
) -> tuple[subprocess.Popen[bytes], dict[str, str]]:
    path = app_path()
    path.unlink(missing_ok=True)
    stdout = subprocess.DEVNULL if quiet else None
    process = subprocess.Popen(
        ["bun", "run", "dev"],
        cwd=app_root / "projects" / "session-server",
        env=env,
        stdout=stdout,
    )
    try:
        return process, wait_for_app(path, process)
    except Exception:
        stop_process(process)
        raise


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
            raise RuntimeError(f"Situ app server exited with code {process.returncode}")
        if path.exists():
            session = json.loads(path.read_text())
            if ping_session(session):
                return session
        time.sleep(0.05)
    raise TimeoutError("timed out waiting for Situ app server")


def wait_for_app(path: Path, process: subprocess.Popen[bytes]) -> dict[str, str]:
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Situ app server exited with code {process.returncode}")
        if path.exists():
            app = json.loads(path.read_text())
            if ping_session(app):
                return app
        time.sleep(0.05)
    raise TimeoutError("timed out waiting for Situ app server")


def read_live_app() -> dict[str, str] | None:
    app = read_app_record()
    if app is None:
        return None
    return app if ping_session(app) else None


def read_app_record() -> dict[str, str] | None:
    path = app_path()
    if not path.exists():
        return None
    try:
        app = json.loads(path.read_text())
    except json.JSONDecodeError:
        return None
    if not isinstance(app, dict):
        return None
    return app


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


def app_path() -> Path:
    return DEFAULTS.local_state_home_path() / "app.json"


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
