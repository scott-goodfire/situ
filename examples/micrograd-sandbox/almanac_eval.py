from __future__ import annotations

import argparse
import json
import os
import random
import time
from typing import Any

from micrograd.engine import Value
from micrograd.nn import MLP


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="print JSON result")
    parser.parse_args()

    components = read_components()
    if components == ["bad"]:
        print(
            json.dumps(
                {
                    "summary": "Suspicious result: huge score jump with changed result shape.",
                    "signals": [{"key": "score", "value": 0.999}],
                    "raw": {"shape": "changed", "eval_status": "ok", "components": components},
                }
            )
        )
        return 0

    started = time.perf_counter()
    random.seed(1337)

    hidden = 3
    steps = 15
    lr = 0.02

    if "A" in components:
        hidden = 4
    if "B" in components:
        steps = 30
    if "C" in components:
        lr = 0.03
    if "A" in components and "C" in components:
        steps = 40

    model = MLP(2, [hidden, hidden, 1])
    xs = [
        [0.0, 0.0],
        [0.0, 1.0],
        [1.0, 0.0],
        [1.0, 1.0],
    ]
    ys = [-1.0, 1.0, 1.0, -1.0]

    last_loss = Value(0.0)
    for _ in range(steps):
        ypred = [model(x) for x in xs]
        last_loss = sum((yout - ygt) ** 2 for ygt, yout in zip(ys, ypred))

        for parameter in model.parameters():
            parameter.grad = 0.0
        last_loss.backward()

        for parameter in model.parameters():
            parameter.data += -lr * parameter.grad

    predictions = [1.0 if model(x).data > 0 else -1.0 for x in xs]
    accuracy = sum(1 for expected, actual in zip(ys, predictions) if expected == actual) / len(ys)
    score = 0.70 + accuracy * 0.10 + (4 - min(last_loss.data, 4)) * 0.03
    runtime_ms = int((time.perf_counter() - started) * 1000)
    tests_passed = gradient_smoke_test()

    print(
        json.dumps(
            {
                "summary": (
                    f"components={components or ['baseline']} score={score:.3f} "
                    f"accuracy={accuracy:.3f} loss={last_loss.data:.4f} runtime_ms={runtime_ms}"
                ),
                "signals": [
                    {"key": "score", "value": round(score, 4)},
                    {"key": "accuracy", "value": round(accuracy, 4)},
                    {"key": "loss", "value": round(last_loss.data, 6)},
                    {"key": "runtime_ms", "value": runtime_ms, "unit": "ms"},
                    {"key": "tests_passed", "value": tests_passed},
                ],
                "raw": {
                    "shape": "standard",
                    "eval_status": "ok" if tests_passed else "failed",
                    "components": components or ["baseline"],
                    "hidden": hidden,
                    "steps": steps,
                    "lr": lr,
                    "predictions": predictions,
                },
            }
        )
    )
    return 0


def read_components() -> list[str]:
    encoded = os.environ.get("ALMANAC_COMPONENTS_JSON")
    if encoded:
        parsed: Any = json.loads(encoded)
        if isinstance(parsed, list):
            return [str(component) for component in parsed if str(component) != "baseline"]

    raw = os.environ.get("ALMANAC_COMPONENTS", "")
    if not raw:
        return []
    return [component for component in raw.split(",") if component and component != "baseline"]


def gradient_smoke_test() -> bool:
    value = Value(2.0)
    result = value * value
    result.backward()
    return abs(value.grad - 4.0) < 1e-9


if __name__ == "__main__":
    raise SystemExit(main())
