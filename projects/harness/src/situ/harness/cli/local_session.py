from __future__ import annotations

import asyncio
import json
import os
import sys
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

LOCAL_RUNTIME_SECRET_ENV = (
    "SITU_ANTHROPIC_KEY",
    "SITU_LOGFIRE_TOKEN",
    "ANTHROPIC_API_KEY",
    "LOGFIRE_TOKEN",
)
HARNESS_STDIO_ENV = "SITU_HARNESS_STDIO"


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
    harness_stdio = current_harness_stdio_path()
    if harness_stdio is not None:
        env[HARNESS_STDIO_ENV] = str(harness_stdio)
    else:
        env.pop(HARNESS_STDIO_ENV, None)
    return env


def current_harness_stdio_path() -> Path | None:
    """Return the harness stdio executable adjacent to the active Python."""
    script_name = "situ-harness-stdio.exe" if os.name == "nt" else "situ-harness-stdio"
    executable = Path(sys.executable)
    candidate = executable.parent / script_name
    if candidate.is_file():
        return candidate
    resolved_candidate = executable.resolve().parent / script_name
    return resolved_candidate if resolved_candidate.is_file() else None


def live_app_matches_env(live_app: dict[str, str], env: dict[str, str]) -> bool:
    """Whether a live app was launched by the same Situ runtime as this CLI."""
    live_harness = live_app.get(HARNESS_STDIO_ENV.lower())
    expected_harness = env.get(HARNESS_STDIO_ENV)
    return (
        not isinstance(live_harness, str)
        or not live_harness
        or not expected_harness
        or live_harness == expected_harness
    )


def live_app_mismatch_message(live_app: dict[str, str], env: dict[str, str]) -> str:
    live_harness = live_app.get(HARNESS_STDIO_ENV.lower()) or "unknown"
    expected_harness = env.get(HARNESS_STDIO_ENV) or "unknown"
    return (
        "active Situ app was launched by a different Situ runtime\n"
        f"  app: {live_app.get('url', 'unknown')}\n"
        f"  app harness: {live_harness}\n"
        f"  this CLI harness: {expected_harness}\n"
        "Use the matching CLI pair, or restart the app with the matching command."
    )


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
    argv, cwd = await _session_server_command()
    stdout = subprocess.DEVNULL if quiet else None
    process = await asyncio.create_subprocess_exec(
        *argv,
        cwd=cwd,
        env=env,
        stdout=stdout,
    )
    try:
        app = await wait_for_app(app_path(), process)
        return process, await ensure_runtime_session(app=app, workspace=workspace)
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
    app = await read_live_app()
    if app is None:
        return None
    try:
        return await ensure_runtime_session(app=app, workspace=workspace)
    except (TimeoutError, OSError, urllib.error.URLError, KeyError, RuntimeError):
        return None


async def read_session_record(workspace: Path) -> dict[str, str] | None:
    return await read_live_session(workspace)


def app_path() -> Path:
    return DEFAULTS.local_state_home_path() / "app.json"


async def ping_session(session: dict[str, str]) -> bool:
    return await asyncio.to_thread(_ping_session_sync, session)


def _ping_session_sync(session: dict[str, str]) -> bool:
    try:
        request = urllib.request.Request(f"{session['url']}/health")
        with urllib.request.urlopen(request, timeout=1) as response:
            return response.status == 200
    except (KeyError, TimeoutError, OSError, urllib.error.URLError):
        return False


async def ensure_runtime_session(
    *,
    app: dict[str, str],
    workspace: Path,
) -> dict[str, str]:
    return await asyncio.to_thread(_ensure_runtime_session_sync, app, workspace)


def _ensure_runtime_session_sync(
    app: dict[str, str],
    workspace: Path,
) -> dict[str, str]:
    body = json.dumps(
        {
            "method": "app.runtime.ensure",
            "params": {},
            "workspace": str(workspace),
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        f"{app['url']}/rpc",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if payload.get("error"):
        error = payload["error"]
        if isinstance(error, dict):
            raise RuntimeError(str(error.get("message", error)))
        raise RuntimeError(str(error))
    result = payload.get("result")
    if not isinstance(result, dict):
        raise RuntimeError("app.runtime.ensure returned no runtime")
    workspace_id = str(result.get("workspace_id") or result.get("project_id") or "")
    resolved_workspace = str(result.get("workspace") or workspace)
    if not workspace_id:
        raise RuntimeError("app.runtime.ensure returned no workspace id")
    return {
        **app,
        "project_id": workspace_id,
        "workspace_id": workspace_id,
        "workspace": resolved_workspace,
    }


async def stop_process(process: asyncio.subprocess.Process) -> None:
    if process.returncode is not None:
        return
    process.terminate()
    try:
        await asyncio.wait_for(process.wait(), timeout=5)
    except TimeoutError:
        process.kill()
        await asyncio.wait_for(process.wait(), timeout=5)
