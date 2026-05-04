from __future__ import annotations

import json
import sys
import time
from typing import Any

from almanac.protocol import (
    ExperimentRunParams,
    ExperimentRunResult,
    SignalRecord,
    WorkerInitializeParams,
    WorkerInitializeResult,
)
from almanac.protocol.jsonrpc import JsonRpcNotification, JsonRpcRequest, JsonRpcResponse


TOY_RESULTS: dict[tuple[str, ...], dict[str, Any]] = {
    ("baseline",): {
        "summary": "Baseline evidence recorded: score 0.710, latency 100ms.",
        "signals": [
            {"key": "score", "value": 0.710},
            {"key": "latency_ms", "value": 100, "unit": "ms"},
        ],
        "raw": {"shape": "standard", "eval_status": "ok", "component": "baseline"},
    },
    ("A",): {
        "summary": "Component A modestly improves score with small latency cost.",
        "signals": [
            {"key": "score", "value": 0.724},
            {"key": "latency_ms", "value": 105, "unit": "ms"},
        ],
        "raw": {"shape": "standard", "eval_status": "ok", "component": "A"},
    },
    ("B",): {
        "summary": "Component B helps a little but costs more latency.",
        "signals": [
            {"key": "score", "value": 0.718},
            {"key": "latency_ms", "value": 160, "unit": "ms"},
        ],
        "raw": {"shape": "standard", "eval_status": "ok", "component": "B"},
    },
    ("C",): {
        "summary": "Component C is a stronger single change.",
        "signals": [
            {"key": "score", "value": 0.740},
            {"key": "latency_ms", "value": 110, "unit": "ms"},
        ],
        "raw": {"shape": "standard", "eval_status": "ok", "component": "C"},
    },
    ("A", "C"): {
        "summary": "A+C combines well and beats either component alone.",
        "signals": [
            {"key": "score", "value": 0.765},
            {"key": "latency_ms", "value": 118, "unit": "ms"},
        ],
        "raw": {"shape": "standard", "eval_status": "ok", "component": "A+C"},
    },
    ("bad",): {
        "summary": "Suspicious toy result: large score jump with changed evidence shape.",
        "signals": [
            {"key": "score", "value": 0.999},
        ],
        "raw": {"shape": "changed", "eval_status": "ok", "component": "bad"},
    },
}


def write(message: JsonRpcResponse | JsonRpcNotification) -> None:
    sys.stdout.write(message.model_dump_json(exclude_none=True))
    sys.stdout.write("\n")
    sys.stdout.flush()


def notify(method: str, params: dict[str, Any]) -> None:
    write(JsonRpcNotification(method=method, params=params))


def handle(request: JsonRpcRequest) -> dict[str, Any]:
    if request.method == "worker.initialize":
        WorkerInitializeParams.model_validate(request.params or {})
        return WorkerInitializeResult(worker_name="toy-worker").model_dump()

    if request.method == "experiment.run":
        params = ExperimentRunParams.model_validate(request.params or {})
        notify(
            "worker.progress",
            {
                "run_id": params.run_id,
                "experiment_id": params.experiment_id,
                "message": f"Applying components: {', '.join(params.components)}",
                "payload": {"components": params.components},
            },
        )
        time.sleep(0.1)
        notify(
            "worker.progress",
            {
                "run_id": params.run_id,
                "experiment_id": params.experiment_id,
                "message": "Collecting toy evidence",
                "payload": {},
            },
        )
        time.sleep(0.1)
        result = TOY_RESULTS.get(tuple(params.components), TOY_RESULTS[("baseline",)])
        return ExperimentRunResult(
            experiment_id=params.experiment_id,
            status="completed",
            summary=str(result["summary"]),
            signals=[SignalRecord(**signal) for signal in result["signals"]],
            raw=dict(result["raw"]),
        ).model_dump()

    raise RuntimeError(f"method not found: {request.method}")


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
