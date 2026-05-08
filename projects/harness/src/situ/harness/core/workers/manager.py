from __future__ import annotations

import asyncio
import inspect
import json
import os
import sys
from pathlib import Path
from typing import Any, Awaitable, Callable

from situ.protocol import (
    ExperimentRunParams,
    ExperimentRunResult,
    WorkerInitializeParams,
    WorkerInitializeResult,
)

ProgressHandler = Callable[[dict[str, Any]], Awaitable[None] | None]


class WorkerManager:
    def __init__(self, workspace_root: Path, app_root: Path | None = None) -> None:
        self.workspace_root = workspace_root
        self.app_root = app_root

    async def run_experiment(
        self,
        params: ExperimentRunParams,
        on_progress: ProgressHandler,
    ) -> ExperimentRunResult:
        command, cwd = self._worker_command()
        process = await asyncio.create_subprocess_exec(
            *command,
            cwd=cwd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={
                **os.environ,
                "PYTHONDONTWRITEBYTECODE": "1",
                "SITU_WORKSPACE": str(self.workspace_root),
                **({"SITU_APP_ROOT": str(self.app_root)} if self.app_root is not None else {}),
            },
        )
        assert process.stdin is not None
        assert process.stdout is not None
        stderr_task: asyncio.Task[bytes] | None = (
            asyncio.create_task(process.stderr.read())
            if process.stderr is not None
            else None
        )

        try:
            init = await self._request(
                process,
                "worker.initialize",
                WorkerInitializeParams().model_dump(),
                request_id="1",
                stderr_task=stderr_task,
            )
            WorkerInitializeResult.model_validate(init)

            result = await self._request(
                process,
                "experiment.run",
                params.model_dump(),
                request_id="2",
                on_notification=on_progress,
                stderr_task=stderr_task,
            )
            return ExperimentRunResult.model_validate(result)
        finally:
            if process.stdin is not None:
                process.stdin.close()
                try:
                    await process.stdin.wait_closed()
                except (BrokenPipeError, ConnectionResetError):
                    pass
            if process.returncode is None:
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), timeout=5)
                except TimeoutError:
                    process.kill()
                    await process.wait()
            if stderr_task is not None:
                if not stderr_task.done():
                    stderr_task.cancel()
                try:
                    await stderr_task
                except asyncio.CancelledError:
                    pass

    async def _request(
        self,
        process: asyncio.subprocess.Process,
        method: str,
        params: dict[str, Any],
        request_id: str,
        on_notification: ProgressHandler | None = None,
        stderr_task: asyncio.Task[bytes] | None = None,
    ) -> dict[str, Any]:
        assert process.stdin is not None
        assert process.stdout is not None

        process.stdin.write(
            json.dumps(
                {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "method": method,
                    "params": params,
                }
            )
            .encode()
            + b"\n"
        )
        await process.stdin.drain()

        while line := await process.stdout.readline():
            message = json.loads(line)
            if "method" in message and "id" not in message:
                if on_notification is not None:
                    result = on_notification(message)
                    if inspect.isawaitable(result):
                        await result
                continue

            if message.get("id") != request_id:
                continue

            if message.get("error"):
                raise RuntimeError(message["error"]["message"])

            return message.get("result") or {}

        stderr = await _stderr_text(stderr_task)
        raise RuntimeError(f"worker exited before responding: {stderr}")

    def _worker_command(self) -> tuple[list[str], Path]:
        workspace_worker = self.workspace_root / "situ_worker.py"
        if workspace_worker.is_file():
            return [sys.executable, str(workspace_worker)], self.workspace_root

        raise RuntimeError(
            "No worker configured. Add situ_worker.py to the workspace or use "
            "workspace tools such as execute for project-native commands."
        )


async def _stderr_text(stderr_task: asyncio.Task[bytes] | None) -> str:
    if stderr_task is None:
        return ""
    try:
        return (await stderr_task).decode(errors="replace")
    except asyncio.CancelledError:
        return ""
