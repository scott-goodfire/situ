from __future__ import annotations

import os
import re
import shlex
import threading
from pathlib import Path

from pydantic_ai_backends import LocalBackend
from pydantic_ai_backends.types import ExecuteResponse

_ENV_LOCK = threading.Lock()
_RUN_LOG_PATTERN = re.compile(r"(?<![\w./-])(?:\./)?run\.log(?![\w./-])")


class SituLocalBackend(LocalBackend):
    def __init__(
        self,
        *,
        command_artifact_dir: Path | None,
        **kwargs: object,
    ) -> None:
        super().__init__(**kwargs)
        self.command_artifact_dir = command_artifact_dir

    def execute(
        self,
        command: str,
        timeout: int | None = None,
    ) -> ExecuteResponse:
        command_artifact_dir = self.command_artifact_dir
        if command_artifact_dir is None:
            return super().execute(command, timeout=timeout)

        command_artifact_dir.mkdir(parents=True, exist_ok=True)
        run_log_path = command_artifact_dir / "run.log"
        execute_env = {
            "SITU_ARTIFACT_DIR": str(command_artifact_dir),
            "SITU_RUN_LOG": str(run_log_path),
        }
        rewritten_command = _rewrite_run_log_references(
            command=command,
            run_log_path=run_log_path,
        )

        with _ENV_LOCK:
            previous = {name: os.environ.get(name) for name in execute_env}
            os.environ.update(execute_env)
            try:
                response = super().execute(rewritten_command, timeout=timeout)
            finally:
                for name, value in previous.items():
                    if value is None:
                        os.environ.pop(name, None)
                    else:
                        os.environ[name] = value

        if rewritten_command == command:
            return response

        note = f"[Situ] Routed run.log to {run_log_path}\n"
        output = f"{response.output}{note}" if response.output else note
        return ExecuteResponse(
            output=output,
            exit_code=response.exit_code,
            truncated=response.truncated,
        )


def command_artifact_dir_for(
    *,
    project_dir: Path | None,
    session_id: str,
    agent_id: str | None,
    active_experiment_id: str | None,
) -> Path | None:
    if project_dir is None:
        return None

    owner = active_experiment_id or agent_id or "unscoped"
    return project_dir / "artifacts" / "commands" / session_id / owner


def _rewrite_run_log_references(
    *,
    command: str,
    run_log_path: Path,
) -> str:
    quoted_path = shlex.quote(str(run_log_path))
    return _RUN_LOG_PATTERN.sub(quoted_path, command)
