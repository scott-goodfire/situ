from __future__ import annotations

import asyncio
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

import aiofiles
import aiofiles.os
import aiofiles.ospath

from ..config import DEFAULTS
from ..core.paths import resolve_bundled_runtime
from ..core.project_context import ProjectContext

LOCAL_RUNTIME_SECRET_ENV = (
    "SITU_ANTHROPIC_KEY",
    "SITU_LOGFIRE_TOKEN",
    "ANTHROPIC_API_KEY",
    "LOGFIRE_TOKEN",
)


def base_env(app_root: Path | None, workspace: Path | None = None) -> dict[str, str]:
    env = os.environ.copy()
    for name in LOCAL_RUNTIME_SECRET_ENV:
        env.pop(name, None)
    if app_root is not None:
        env["SITU_APP_ROOT"] = str(app_root)
    else:
        env.pop("SITU_APP_ROOT", None)
    if workspace is not None:
        env["SITU_WORKSPACE"] = str(workspace)
    else:
        env.pop("SITU_WORKSPACE", None)
    return env


async def start_app_server(
    env: dict[str, str],
    *,
    quiet: bool = False,
) -> tuple[asyncio.subprocess.Process, dict[str, str]]:
    path = app_path()
    try:
        await aiofiles.os.remove(path)
    except FileNotFoundError:
        pass
    argv, cwd = await _session_server_command()
    stdout = subprocess.DEVNULL if quiet else None
    process = await asyncio.create_subprocess_exec(
        *argv,
        cwd=cwd,
        env=env,
        stdout=stdout,
    )
    try:
        return process, await wait_for_app(path, process)
    except Exception:
        await stop_process(process)
        raise


async def start_session_server(
    workspace: Path,
    env: dict[str, str],
    *,
    quiet: bool = False,
) -> tuple[asyncio.subprocess.Process, dict[str, str]]:
    path = session_path(workspace)
    try:
        await aiofiles.os.remove(path)
    except FileNotFoundError:
        pass
    argv, cwd = await _session_server_command()
    stdout = subprocess.DEVNULL if quiet else None
    process = await asyncio.create_subprocess_exec(
        *argv,
        cwd=cwd,
        env=env,
        stdout=stdout,
    )
    try:
        return process, await wait_for_session(path, process)
    except Exception:
        await stop_process(process)
        raise


async def _session_server_command() -> tuple[list[str], Path | None]:
    runtime = await resolve_bundled_runtime("session-server")
    if runtime is None:
        raise RuntimeError(
            "could not resolve session-server runtime; "
            "set SITU_APP_ROOT for source mode or reinstall Situ"
        )
    return runtime.subprocess_args()


async def wait_for_session(
    path: Path,
    process: asyncio.subprocess.Process,
) -> dict[str, str]:
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        if process.returncode is not None:
            raise RuntimeError(f"Situ app server exited with code {process.returncode}")
        if await aiofiles.ospath.exists(path):
            async with aiofiles.open(path, encoding="utf-8") as file:
                session = json.loads(await file.read())
            if await ping_session(session):
                return session
        await asyncio.sleep(0.05)
    raise TimeoutError("timed out waiting for Situ app server")


async def wait_for_app(
    path: Path,
    process: asyncio.subprocess.Process,
) -> dict[str, str]:
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        if process.returncode is not None:
            raise RuntimeError(f"Situ app server exited with code {process.returncode}")
        if await aiofiles.ospath.exists(path):
            async with aiofiles.open(path, encoding="utf-8") as file:
                app = json.loads(await file.read())
            if await ping_session(app):
                return app
        await asyncio.sleep(0.05)
    raise TimeoutError("timed out waiting for Situ app server")


async def read_live_app() -> dict[str, str] | None:
    app = await read_app_record()
    if app is None:
        return None
    return app if await ping_session(app) else None


async def read_app_record() -> dict[str, str] | None:
    path = app_path()
    if not await aiofiles.ospath.exists(path):
        return None
    try:
        async with aiofiles.open(path, encoding="utf-8") as file:
            app = json.loads(await file.read())
    except json.JSONDecodeError:
        return None
    if not isinstance(app, dict):
        return None
    return app


async def read_live_session(workspace: Path) -> dict[str, str] | None:
    session = await read_session_record(workspace)
    if session is None:
        return None
    return session if await ping_session(session) else None


async def read_session_record(workspace: Path) -> dict[str, str] | None:
    path = session_path(workspace)
    if not await aiofiles.ospath.exists(path):
        return None
    try:
        async with aiofiles.open(path, encoding="utf-8") as file:
            session = json.loads(await file.read())
    except json.JSONDecodeError:
        return None
    if not isinstance(session, dict):
        return None
    return session


def session_path(workspace: Path) -> Path:
    return ProjectContext(workspace).project_dir / "session.json"


def app_path() -> Path:
    return DEFAULTS.local_state_home_path() / "app.json"


async def ping_session(session: dict[str, str]) -> bool:
    return await asyncio.to_thread(_ping_session_sync, session)


def _ping_session_sync(session: dict[str, str]) -> bool:
    try:
        request = urllib.request.Request(
            f"{session['url']}/health",
            headers={"Authorization": f"Bearer {session['token']}"},
        )
        with urllib.request.urlopen(request, timeout=1) as response:
            return response.status == 200
    except (KeyError, TimeoutError, OSError, urllib.error.URLError):
        return False


async def stop_process(process: asyncio.subprocess.Process) -> None:
    if process.returncode is not None:
        return
    process.terminate()
    try:
        await asyncio.wait_for(process.wait(), timeout=5)
    except TimeoutError:
        process.kill()
        await asyncio.wait_for(process.wait(), timeout=5)
