from __future__ import annotations

from typing import Any


def check_result(
    *,
    known_signals: list[str],
    baseline_score: float | None,
    signals: list[dict[str, Any]],
    raw: dict[str, Any],
) -> list[tuple[str, str]]:
    concerns: list[tuple[str, str]] = []
    signal_map = {signal["key"]: signal.get("value") for signal in signals}

    for key in known_signals:
        if key not in signal_map:
            concerns.append(("missing_signal", f"Expected signal missing: {key}"))

    if raw.get("shape") != "standard":
        concerns.append(("signal_shape_changed", "Result shape changed unexpectedly."))

    for key, value in signal_map.items():
        if key in {"score", "latency_ms"} and not isinstance(value, int | float):
            concerns.append(("signal_type_changed", f"Signal {key} is not numeric."))

    score = signal_map.get("score")
    if isinstance(score, int | float) and baseline_score is not None:
        if float(score) - baseline_score > 0.2:
            concerns.append(("suspicious_improvement", "Score improved suspiciously much without corroboration."))

    if raw.get("eval_status") == "failed":
        concerns.append(("evaluation_failed", "Evaluation failed."))

    return concerns
