from __future__ import annotations

import json
import os
import re
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
        *,
        context: str = "",
    ) -> ExperimentRunResult:
        eval_command = infer_eval_command(context)
        command, cwd = self._worker_command(eval_command)
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
                **({"ALMANAC_EVAL_COMMAND": eval_command} if eval_command else {}),
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

    def _worker_command(self, eval_command: str) -> tuple[list[str], Path]:
        if eval_command or os.environ.get("ALMANAC_EVAL_COMMAND"):
            return [sys.executable, str(self._built_in_worker("local_command_worker"))], self.workspace_root

        workspace_worker = self.workspace_root / "almanac_worker.py"
        if workspace_worker.is_file():
            return [sys.executable, str(workspace_worker)], self.workspace_root

        raise RuntimeError(
            "No worker configured. Add a command such as 'Run make eval from the repo root' "
            "to --context, or add almanac_worker.py to the workspace."
        )

    def _built_in_worker(self, name: str) -> Path:
        if self.app_root is None:
            raise RuntimeError("ALMANAC_APP_ROOT is required for built-in workers")
        worker = self.app_root / "workers" / name / "worker.py"
        if not worker.is_file():
            raise RuntimeError(f"built-in worker not found: {worker}")
        return worker


def infer_eval_command(context: str) -> str:
    for pattern in [
        r"(?:run|execute|use)\s+`([^`]+)`",
        r"(?:eval command|command)\s*[:=]\s*`?([^`\n.;]+)`?",
        r"(?:run|execute|use)\s+(.+?)(?:\s+from\b|\.|;|\n|$)",
    ]:
        match = re.search(pattern, context, flags=re.IGNORECASE)
        if match is None:
            continue

        command = match.group(1).strip(" `")
        if looks_like_command(command):
            return command

    return ""


def looks_like_command(command: str) -> bool:
    if not command or command.lower().startswith(("the ", "a ", "an ")):
        return False
    executable = command.split()[0]
    return executable in {
        "make",
        "python",
        "python3",
        "pytest",
        "npm",
        "pnpm",
        "bun",
        "yarn",
        "cargo",
        "go",
        "uv",
        "bash",
        "sh",
        "./scripts/eval",
        "./scripts/eval.sh",
    } or executable.startswith("./")
