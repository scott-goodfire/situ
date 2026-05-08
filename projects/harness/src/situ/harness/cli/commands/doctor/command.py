from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path
from typing import Any

import aiofiles.ospath

from ....config import DEFAULTS, LocalSecretStore
from ....core.install_info import install_info
from ....core.paths import find_bundled_resource, resolve_bundled_runtime
from ...headless._shared.output import write_json
from ...local_session import read_app_record


RUNTIMES = (
    ("tui", "tui"),
    ("session-server", "session-server"),
    ("web-server", "web"),
)
SITU_ENV_VARS = (
    "SITU_APP_ROOT",
    "SITU_WORKSPACE",
    "SITU_RELEASE_REPO",
    "SITU_INSTALL_HOME",
    "SITU_BIN_DIR",
    "SITU_VERSION",
)


def run(args: argparse.Namespace) -> int:
    return asyncio.run(run_async(args))


async def run_async(args: argparse.Namespace) -> int:
    report = await _build_report()
    if bool(getattr(args, "json", False)):
        write_json(report)
        return 0
    _write_human_readable(report)
    return 0 if report["healthy"] else 1


async def _build_report() -> dict[str, Any]:
    info = install_info()

    runtimes = await _runtimes_summary()
    state_home = await _state_home_summary()
    secrets = await _secrets_summary()
    app_state = await _app_discovery_summary()
    path_status = _path_status(info.bin_path)

    healthy = (
        runtimes["all_resolved"]
        and state_home["writable"]
        and (info.method != "curl" or path_status == "ok")
    )

    return {
        "healthy": healthy,
        "version": info.version,
        "method": info.method,
        "git_sha": info.git_sha,
        "install_home": str(info.install_home) if info.install_home else None,
        "version_dir": str(info.version_dir) if info.version_dir else None,
        "bin_path": str(info.bin_path) if info.bin_path else None,
        "python": {
            "executable": sys.executable,
            "version": sys.version.split()[0],
        },
        "path_status": path_status,
        "runtimes": runtimes,
        "state_home": state_home,
        "secrets": secrets,
        "app_state": app_state,
        "env": {name: os.environ.get(name) for name in SITU_ENV_VARS},
    }


async def _runtimes_summary() -> dict[str, Any]:
    items: dict[str, dict[str, str | None]] = {}
    for name, source_dir in RUNTIMES:
        runtime = await resolve_bundled_runtime(name, source_dir=source_dir)
        items[name] = {
            "kind": runtime.kind if runtime else "missing",
            "path": str(runtime.path) if runtime else None,
        }
    web_dist = await find_bundled_resource("web")
    items["web"] = {
        "kind": "installed" if web_dist else "missing",
        "path": str(web_dist) if web_dist else None,
    }
    return {
        "all_resolved": all(item["kind"] != "missing" for name, item in items.items() if name != "web"),
        "items": items,
    }


async def _state_home_summary() -> dict[str, Any]:
    path = DEFAULTS.local_state_home_path()
    exists = await aiofiles.ospath.isdir(path)
    writable = os.access(path, os.W_OK) if exists else os.access(path.parent, os.W_OK)
    return {
        "path": str(path),
        "exists": exists,
        "writable": writable,
    }


async def _secrets_summary() -> dict[str, bool]:
    store = LocalSecretStore()
    return {
        "anthropic_present": (await store.get_anthropic_key()) is not None,
        "logfire_present": (await store.get_logfire_token()) is not None,
    }


async def _app_discovery_summary() -> dict[str, Any]:
    record = await read_app_record()
    return {
        "live_app_record": record is not None,
        "app_url": record.get("url") if record else None,
    }


def _path_status(bin_path: Path | None) -> str:
    if bin_path is None:
        return "n/a"
    bin_dir = str(bin_path.parent)
    user_bin = str(Path.home() / ".local" / "bin")
    paths = os.environ.get("PATH", "").split(os.pathsep)
    if user_bin in paths or bin_dir in paths:
        return "ok"
    return "missing"


def _write_human_readable(report: dict[str, Any]) -> None:
    out = sys.stdout.write
    out(f"situ:           {report['version']}\n")
    out(f"method:         {report['method']}\n")
    if report["git_sha"]:
        out(f"git sha:        {report['git_sha'][:8]}\n")
    if report["install_home"]:
        out(f"install home:   {report['install_home']}\n")
    if report["version_dir"]:
        out(f"version dir:    {report['version_dir']}\n")
    if report["bin_path"]:
        out(f"launcher:       {report['bin_path']}\n")
    out(f"PATH includes:  {report['path_status']}\n")

    out(f"\npython:         {report['python']['version']} ({report['python']['executable']})\n")

    out("\nruntimes:\n")
    for name, item in report["runtimes"]["items"].items():
        marker = "✓" if item["kind"] != "missing" else "✗"
        path = item["path"] or "missing"
        out(f"  {marker} {name} ({item['kind']}): {path}\n")

    out(f"\nstate home:     {report['state_home']['path']}\n")
    out(f"  exists:       {report['state_home']['exists']}\n")
    out(f"  writable:     {report['state_home']['writable']}\n")

    out(f"\nsecrets:\n")
    out(f"  anthropic:    {'present' if report['secrets']['anthropic_present'] else 'missing'}\n")
    out(f"  logfire:      {'present' if report['secrets']['logfire_present'] else 'missing'}\n")

    out(f"\napp state:\n")
    out(f"  live record:  {report['app_state']['live_app_record']}\n")
    if report["app_state"]["app_url"]:
        out(f"  url:          {report['app_state']['app_url']}\n")

    set_env = {k: v for k, v in report["env"].items() if v}
    if set_env:
        out("\nenvironment:\n")
        for name, value in set_env.items():
            out(f"  {name}={value}\n")

    out(f"\nhealthy: {report['healthy']}\n")
