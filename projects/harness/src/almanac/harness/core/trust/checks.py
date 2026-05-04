from __future__ import annotations

from typing import Any


def check_evidence(
    *,
    known_signals: list[str],
    baseline_score: float | None,
    signals: list[dict[str, Any]],
    raw: dict[str, Any],
) -> list[tuple[str, str]]:
    warnings: list[tuple[str, str]] = []
    signal_map = {signal["key"]: signal.get("value") for signal in signals}

    for key in known_signals:
        if key not in signal_map:
            warnings.append(("missing_signal", f"Expected signal missing: {key}"))

    if raw.get("shape") != "standard":
        warnings.append(("signal_shape_changed", "Evidence shape changed unexpectedly."))

    for key, value in signal_map.items():
        if key in {"score", "latency_ms"} and not isinstance(value, int | float):
            warnings.append(("signal_type_changed", f"Signal {key} is not numeric."))

    score = signal_map.get("score")
    if isinstance(score, int | float) and baseline_score is not None:
        if float(score) - baseline_score > 0.2:
            warnings.append(("suspicious_improvement", "Score improved suspiciously much without corroboration."))

    if raw.get("eval_status") == "failed":
        warnings.append(("evaluation_failed", "Evaluation failed."))

    return warnings
