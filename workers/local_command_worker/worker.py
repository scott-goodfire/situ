from __future__ import annotations

import json
import os
import re
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

    parsed = parse_command_output(completed.stdout, completed.stderr)
    raw = {
        "shape": "standard",
        "eval_status": "ok" if completed.returncode == 0 else "failed",
        "command": command,
        "returncode": completed.returncode,
        "stdout": completed.stdout[-4000:],
        "stderr": completed.stderr[-4000:],
        "output_format": parsed.get("output_format", "json"),
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
            signals=normalize_signals(parsed),
            raw=raw,
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


def parse_command_output(stdout: str, stderr: str) -> dict[str, Any]:
    parsed = parse_json_stdout(stdout)
    if parsed is not None:
        parsed["output_format"] = "json"
        return parsed

    signals = infer_signals_from_text("\n".join([stdout, stderr]))
    return {
        "summary": summarize_text_output(stdout, stderr, signals),
        "signals": signals,
        "raw": {"output_format": "text"},
        "output_format": "text",
    }


def parse_json_stdout(stdout: str) -> dict[str, Any] | None:
    stripped = stdout.strip()
    if not stripped:
        return None

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
            return None

    if not isinstance(parsed, dict):
        raise RuntimeError("eval command JSON output must be an object")
    return parsed


def infer_signals_from_text(text: str) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []
    seen: set[str] = set()

    for match in re.finditer(
        r"\b([A-Za-z_][\w.-]*)\s*[:=]\s*(true|false|-?\d+(?:\.\d+)?%?|[-+]?\d+(?:\.\d+)?\s*ms)\b",
        text,
        flags=re.IGNORECASE,
    ):
        key = normalize_key(match.group(1), match.group(2))
        if key in seen:
            continue
        seen.add(key)
        signals.append({"key": key, "value": parse_signal_value(match.group(2))})

    lowered = text.lower()
    if "tests_passed" not in seen:
        if "tests passed" in lowered or "checks passed" in lowered:
            signals.append({"key": "tests_passed", "value": True})
            seen.add("tests_passed")
        elif "tests failed" in lowered or "checks failed" in lowered:
            signals.append({"key": "tests_passed", "value": False})
            seen.add("tests_passed")

    return signals


def normalize_key(key: str, raw_value: str) -> str:
    normalized = key.strip().lower().replace("-", "_")
    if normalized == "runtime" and raw_value.strip().lower().endswith("ms"):
        return "runtime_ms"
    return normalized


def parse_signal_value(value: str) -> Any:
    stripped = value.strip()
    lowered = stripped.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if lowered.endswith("ms"):
        return parse_number(lowered.removesuffix("ms").strip())
    if stripped.endswith("%"):
        return parse_number(stripped.removesuffix("%").strip())
    return parse_number(stripped)


def parse_number(value: str) -> int | float | str:
    try:
        as_float = float(value)
    except ValueError:
        return value
    if as_float.is_integer():
        return int(as_float)
    return as_float


def summarize_text_output(
    stdout: str,
    stderr: str,
    signals: list[dict[str, Any]],
) -> str:
    for line in stdout.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    for line in stderr.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    if signals:
        rendered = ", ".join(f"{signal.get('key')}={signal.get('value')}" for signal in signals)
        return f"Parsed command output: {rendered}."
    return "Command completed without parseable output."


def normalize_signals(parsed: dict[str, Any]) -> list[dict[str, Any]]:
    signals = parsed.get("signals")
    if isinstance(signals, list):
        return [signal for signal in signals if isinstance(signal, dict)]
    if isinstance(signals, dict):
        return [{"key": key, "value": value} for key, value in signals.items()]

    ignored = {"summary", "status", "raw"}
    return [
        {"key": key, "value": value}
        for key, value in parsed.items()
        if key not in ignored and isinstance(value, str | int | float | bool | type(None))
    ]


def summarize(params: ExperimentRunParams, signals: list[dict[str, Any]]) -> str:
    rendered = ", ".join(f"{signal.get('key')}={signal.get('value')}" for signal in signals)
    suffix = f": {rendered}" if rendered else ""
    return f"Collected result for {params.experiment_id}{suffix}."


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
