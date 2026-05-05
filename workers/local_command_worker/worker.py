from __future__ import annotations

import json
import os
import subprocess
import sys
from typing import Any

from almanac.harness.config import DEFAULTS
from almanac.protocol import (
    ExperimentRunParams,
    ExperimentRunResult,
    WorkerInitializeParams,
    WorkerInitializeResult,
)
from almanac.protocol.jsonrpc import JsonRpcNotification, JsonRpcRequest, JsonRpcResponse


def write(message: JsonRpcResponse | JsonRpcNotification) -> None:
    sys.stdout.write(message.model_dump_json(exclude_none=True))
    sys.stdout.write("\n")
    sys.stdout.flush()


def notify(method: str, params: dict[str, Any]) -> None:
    write(JsonRpcNotification(method=method, params=params))


def handle(request: JsonRpcRequest) -> dict[str, Any]:
    if request.method == "worker.initialize":
        WorkerInitializeParams.model_validate(request.params or {})
        return WorkerInitializeResult(worker_name="local-command-worker").model_dump()

    if request.method == "experiment.run":
        params = ExperimentRunParams.model_validate(request.params or {})
        return run_eval_command(params).model_dump()

    raise RuntimeError(f"method not found: {request.method}")


def run_eval_command(params: ExperimentRunParams) -> ExperimentRunResult:
    command = os.environ.get("ALMANAC_EVAL_COMMAND")
    if not command:
        raise RuntimeError("ALMANAC_EVAL_COMMAND is required for local-command-worker")

    notify(
        "worker.progress",
        {
            "session_id": params.session_id,
            "experiment_id": params.experiment_id,
            "message": f"Running eval command for {params.experiment_id}",
            "payload": {"components": params.components, "command": command},
        },
    )

    completed = subprocess.run(
        command,
        cwd=os.environ.get("ALMANAC_WORKSPACE") or os.getcwd(),
        env={
            **os.environ,
            "ALMANAC_SESSION_ID": params.session_id,
            "ALMANAC_RUN_ID": params.session_id,
            "ALMANAC_EXPERIMENT_ID": params.experiment_id,
            "ALMANAC_COMPONENTS": ",".join(params.components),
            "ALMANAC_COMPONENTS_JSON": json.dumps(params.components),
            "ALMANAC_BASED_ON_JSON": json.dumps(params.based_on),
        },
        shell=True,
        executable="/bin/bash" if os.path.exists("/bin/bash") else None,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=DEFAULTS.eval_timeout_seconds,
    )

    raw = {
        "shape": "standard",
        "eval_status": "ok" if completed.returncode == 0 else "failed",
        "command": command,
        "returncode": completed.returncode,
        "stdout": completed.stdout[-4000:],
        "stderr": completed.stderr[-4000:],
    }

    if completed.returncode != 0:
        return ExperimentRunResult(
            experiment_id=params.experiment_id,
            status="failed",
            summary=f"Eval command failed with exit code {completed.returncode}.",
            signals=[],
            raw=raw,
        )

    return ExperimentRunResult(
        experiment_id=params.experiment_id,
        status="completed",
        summary=summarize_plaintext_output(
            params=params,
            stdout=completed.stdout,
            stderr=completed.stderr,
        ),
        signals=[],
        raw=raw,
    )


def summarize_plaintext_output(
    *,
    params: ExperimentRunParams,
    stdout: str,
    stderr: str,
) -> str:
    for line in stdout.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    for line in stderr.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    return f"Collected plaintext output for {params.experiment_id}."


def main() -> None:
    for line in sys.stdin:
        if not line.strip():
            continue
        request = JsonRpcRequest.model_validate_json(line)
        if request.id is None:
            continue
        try:
            result = handle(request)
            write(JsonRpcResponse.result_response(request.id, result))
        except Exception as error:
            write(JsonRpcResponse.error_response(request.id, -32000, str(error)))


if __name__ == "__main__":
    main()
