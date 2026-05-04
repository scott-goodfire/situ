from __future__ import annotations

import json
import os
import shlex
import subprocess
import sys
from typing import Any

from almanac.protocol import (
    ExperimentRunParams,
    ExperimentRunResult,
    SignalRecord,
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
            "run_id": params.run_id,
            "experiment_id": params.experiment_id,
            "message": f"Running eval command for {params.experiment_id}",
            "payload": {"components": params.components, "command": command},
        },
    )

    completed = subprocess.run(
        shlex.split(command),
        cwd=os.environ.get("ALMANAC_WORKSPACE") or os.getcwd(),
        env={
            **os.environ,
            "ALMANAC_RUN_ID": params.run_id,
            "ALMANAC_EXPERIMENT_ID": params.experiment_id,
            "ALMANAC_COMPONENTS": ",".join(params.components),
            "ALMANAC_COMPONENTS_JSON": json.dumps(params.components),
            "ALMANAC_BASED_ON_JSON": json.dumps(params.based_on),
        },
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=int(os.environ.get("ALMANAC_EVAL_TIMEOUT_SECONDS", "120")),
    )

    parsed = parse_json_stdout(completed.stdout)
    raw = {
        "shape": "standard",
        "eval_status": "ok" if completed.returncode == 0 else "failed",
        "command": command,
        "returncode": completed.returncode,
        "stderr": completed.stderr[-4000:],
    }
    if isinstance(parsed.get("raw"), dict):
        raw.update(parsed["raw"])
    else:
        raw["output"] = parsed

    if completed.returncode != 0:
        return ExperimentRunResult(
            experiment_id=params.experiment_id,
            status="failed",
            summary=f"Eval command failed with exit code {completed.returncode}.",
            signals=[],
            raw={**raw, "stdout": completed.stdout[-4000:]},
        )

    signals = normalize_signals(parsed)
    summary = str(parsed.get("summary") or summarize(params, signals))
    return ExperimentRunResult(
        experiment_id=params.experiment_id,
        status=str(parsed.get("status") or "completed"),
        summary=summary,
        signals=signals,
        raw=raw,
    )


def parse_json_stdout(stdout: str) -> dict[str, Any]:
    stripped = stdout.strip()
    if not stripped:
        return {}

    try:
        parsed = json.loads(stripped)
    except json.JSONDecodeError:
        for line in reversed(stripped.splitlines()):
            candidate = line.strip()
            if not candidate:
                continue
            try:
                parsed = json.loads(candidate)
                break
            except json.JSONDecodeError:
                continue
        else:
            raise RuntimeError("eval command did not print JSON")

    if not isinstance(parsed, dict):
        raise RuntimeError("eval command JSON output must be an object")
    return parsed


def normalize_signals(parsed: dict[str, Any]) -> list[SignalRecord]:
    signals = parsed.get("signals")
    if isinstance(signals, list):
        return [SignalRecord(**signal) for signal in signals if isinstance(signal, dict)]
    if isinstance(signals, dict):
        return [SignalRecord(key=key, value=value) for key, value in signals.items()]

    ignored = {"summary", "status", "raw"}
    return [
        SignalRecord(key=key, value=value)
        for key, value in parsed.items()
        if key not in ignored and isinstance(value, str | int | float | bool | type(None))
    ]


def summarize(params: ExperimentRunParams, signals: list[SignalRecord]) -> str:
    rendered = ", ".join(f"{signal.key}={signal.value}" for signal in signals)
    suffix = f": {rendered}" if rendered else ""
    return f"Collected evidence for {params.experiment_id}{suffix}."


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
