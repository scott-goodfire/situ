from __future__ import annotations

import asyncio
import os
import re
import shlex
import threading
from dataclasses import dataclass
from pathlib import Path

from pydantic_ai_backends import LocalBackend
from pydantic_ai_backends.types import ExecuteResponse

_ENV_LOCK = threading.Lock()
_RUN_LOG_PATTERN = re.compile(r"(?<![\w./-])(?:\./)?run\.log(?![\w./-])")


@dataclass(frozen=True, slots=True)
class CommandReceiptDraft:
    command: str
    rewritten_command: str
    cwd: str
    timeout: int | None
    output: str
    exit_code: int
    truncated: bool
    command_artifact_dir: str
    run_log_path: str


class SituLocalBackend(LocalBackend):
    def __init__(
        self,
        *,
        root_dir: Path,
        command_artifact_dir: Path | None,
        **kwargs: object,
    ) -> None:
        super().__init__(root_dir=root_dir, **kwargs)
        self.workspace_root = root_dir
        self.command_artifact_dir = command_artifact_dir
        self._command_receipts: list[CommandReceiptDraft] = []
        self._command_receipt_lock = threading.Lock()

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

        self._record_command_receipt(
            command=command,
            rewritten_command=rewritten_command,
            timeout=timeout,
            response=response,
            command_artifact_dir=command_artifact_dir,
            run_log_path=run_log_path,
        )

        if rewritten_command == command:
            return response

        note = f"[Situ] Routed run.log to {run_log_path}\n"
        output = f"{response.output}{note}" if response.output else note
        return ExecuteResponse(
            output=output,
            exit_code=response.exit_code,
            truncated=response.truncated,
        )

    async def execute_async(
        self,
        command: str,
        timeout: int | None = None,
    ) -> ExecuteResponse:
        command_artifact_dir = self.command_artifact_dir
        if command_artifact_dir is None:
            return await self._execute_shell_async(command, timeout=timeout)

        command_artifact_dir.mkdir(parents=True, exist_ok=True)
        run_log_path = command_artifact_dir / "run.log"
        rewritten_command = _rewrite_run_log_references(
            command=command,
            run_log_path=run_log_path,
        )
        response = await self._execute_shell_async(
            rewritten_command,
            timeout=timeout,
            extra_env={
                "SITU_ARTIFACT_DIR": str(command_artifact_dir),
                "SITU_RUN_LOG": str(run_log_path),
            },
        )

        self._record_command_receipt(
            command=command,
            rewritten_command=rewritten_command,
            timeout=timeout,
            response=response,
            command_artifact_dir=command_artifact_dir,
            run_log_path=run_log_path,
        )

        if rewritten_command == command:
            return response

        note = f"[Situ] Routed run.log to {run_log_path}\n"
        output = f"{response.output}{note}" if response.output else note
        return ExecuteResponse(
            output=output,
            exit_code=response.exit_code,
            truncated=response.truncated,
        )

    def pop_command_receipts(self) -> list[CommandReceiptDraft]:
        with self._command_receipt_lock:
            receipts = list(self._command_receipts)
            self._command_receipts.clear()
            return receipts

    def _record_command_receipt(
        self,
        *,
        command: str,
        rewritten_command: str,
        timeout: int | None,
        response: ExecuteResponse,
        command_artifact_dir: Path,
        run_log_path: Path,
    ) -> None:
        with self._command_receipt_lock:
            self._command_receipts.append(
                CommandReceiptDraft(
                    command=command,
                    rewritten_command=rewritten_command,
                    cwd=str(self.workspace_root),
                    timeout=timeout,
                    output=response.output,
                    exit_code=response.exit_code,
                    truncated=response.truncated,
                    command_artifact_dir=str(command_artifact_dir),
                    run_log_path=str(run_log_path),
                )
            )

    async def _execute_shell_async(
        self,
        command: str,
        *,
        timeout: int | None,
        extra_env: dict[str, str] | None = None,
    ) -> ExecuteResponse:
        if not self.execute_enabled:
            raise RuntimeError(
                "Shell execution is disabled for this backend. "
                "Initialize with enable_execute=True to enable."
            )

        perm_error = self._check_permission_sync("execute", command)
        if perm_error:
            return ExecuteResponse(
                output=f"Error: {perm_error}",
                exit_code=1,
                truncated=False,
            )

        try:
            process = await asyncio.create_subprocess_exec(
                "sh",
                "-c",
                command,
                cwd=self.root_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ, **(extra_env or {})},
            )
        except Exception as error:  # pragma: no cover
            return ExecuteResponse(
                output=f"Error: {error}",
                exit_code=1,
                truncated=False,
            )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout or 120,
            )
        except TimeoutError:
            process.kill()
            await process.communicate()
            return ExecuteResponse(
                output="Error: Command timed out",
                exit_code=124,
                truncated=False,
            )
        except Exception as error:  # pragma: no cover
            if process.returncode is None:
                process.kill()
                await process.wait()
            return ExecuteResponse(
                output=f"Error: {error}",
                exit_code=1,
                truncated=False,
            )

        output = stdout.decode(errors="replace") + stderr.decode(errors="replace")
        max_output = 100000
        truncated = len(output) > max_output
        if truncated:  # pragma: no cover
            output = output[:max_output]

        return ExecuteResponse(
            output=output,
            exit_code=process.returncode,
            truncated=truncated,
        )


def command_artifact_dir_for(
    *,
    project_dir: Path | None,
    session_id: str,
    agent_id: str | None,
    active_experiment_id: str | None,
    active_task_id: str | None = None,
) -> Path | None:
    if project_dir is None:
        return None

    owner = active_experiment_id or active_task_id or agent_id or "unscoped"
    return project_dir / "artifacts" / "commands" / session_id / owner


def _rewrite_run_log_references(
    *,
    command: str,
    run_log_path: Path,
) -> str:
    quoted_path = shlex.quote(str(run_log_path))
    return _RUN_LOG_PATTERN.sub(quoted_path, command)
