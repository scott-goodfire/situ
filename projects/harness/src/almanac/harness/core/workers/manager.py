from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable

from almanac.protocol import (
    ExperimentRunParams,
    ExperimentRunResult,
    WorkerInitializeParams,
    WorkerInitializeResult,
)

ProgressHandler = Callable[[dict[str, Any]], None]


class WorkerManager:
    def __init__(self, workspace_root: Path, app_root: Path | None = None) -> None:
        self.workspace_root = workspace_root
        self.app_root = app_root

    def run_experiment(
        self,
        params: ExperimentRunParams,
        on_progress: ProgressHandler,
    ) -> ExperimentRunResult:
        command, cwd = self._worker_command()
        process = subprocess.Popen(
            command,
            cwd=cwd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={
                **os.environ,
                "PYTHONDONTWRITEBYTECODE": "1",
                "ALMANAC_WORKSPACE": str(self.workspace_root),
                **({"ALMANAC_APP_ROOT": str(self.app_root)} if self.app_root is not None else {}),
            },
        )
        assert process.stdin is not None
        assert process.stdout is not None

        try:
            init = self._request(
                process,
                "worker.initialize",
                WorkerInitializeParams().model_dump(),
                request_id="1",
            )
            WorkerInitializeResult.model_validate(init)

            result = self._request(
                process,
                "experiment.run",
                params.model_dump(),
                request_id="2",
                on_notification=on_progress,
            )
            return ExperimentRunResult.model_validate(result)
        finally:
            process.stdin.close()
            process.terminate()
            process.wait(timeout=5)

    def _request(
        self,
        process: subprocess.Popen[str],
        method: str,
        params: dict[str, Any],
        request_id: str,
        on_notification: ProgressHandler | None = None,
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
            + "\n"
        )
        process.stdin.flush()

        for line in process.stdout:
            message = json.loads(line)
            if "method" in message and "id" not in message:
                if on_notification is not None:
                    on_notification(message)
                continue

            if message.get("id") != request_id:
                continue

            if message.get("error"):
                raise RuntimeError(message["error"]["message"])

            return message.get("result") or {}

        stderr = process.stderr.read() if process.stderr is not None else ""
        raise RuntimeError(f"worker exited before responding: {stderr}")

    def _worker_command(self) -> tuple[list[str], Path]:
        workspace_worker = self.workspace_root / "almanac_worker.py"
        if workspace_worker.is_file():
            return [sys.executable, str(workspace_worker)], self.workspace_root

        raise RuntimeError(
            "No worker configured. Add almanac_worker.py to the workspace or use "
            "workspace tools such as execute for project-native commands."
        )
