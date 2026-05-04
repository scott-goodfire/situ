from __future__ import annotations

from evals.worlds.micrograd.models import MicrogradEvidence

MICROGRAD_RESULTS: dict[tuple[str, ...], MicrogradEvidence] = {
    ("baseline",): MicrogradEvidence(
        experiment_id="exp_baseline",
        components=("baseline",),
        summary="Baseline evidence: score=0.710 accuracy=0.500 loss=3.00 runtime_ms=10 tests_passed=True.",
        signals={"score": 0.710, "accuracy": 0.5, "loss": 3.0, "runtime_ms": 10, "tests_passed": True},
        raw={"shape": "standard", "eval_status": "ok", "components": ["baseline"]},
    ),
    ("A",): MicrogradEvidence(
        experiment_id="exp_a",
        components=("A",),
        summary="Variant A modestly improves score with low runtime cost.",
        signals={"score": 0.724, "accuracy": 0.5, "loss": 2.6, "runtime_ms": 12, "tests_passed": True},
        raw={"shape": "standard", "eval_status": "ok", "components": ["A"]},
    ),
    ("B",): MicrogradEvidence(
        experiment_id="exp_b",
        components=("B",),
        summary="Variant B improves slightly but costs more runtime.",
        signals={"score": 0.718, "accuracy": 0.5, "loss": 2.8, "runtime_ms": 35, "tests_passed": True},
        raw={"shape": "standard", "eval_status": "ok", "components": ["B"]},
    ),
    ("C",): MicrogradEvidence(
        experiment_id="exp_c",
        components=("C",),
        summary="Variant C is the strongest single change.",
        signals={"score": 0.740, "accuracy": 0.75, "loss": 2.1, "runtime_ms": 16, "tests_passed": True},
        raw={"shape": "standard", "eval_status": "ok", "components": ["C"]},
    ),
    ("A", "C"): MicrogradEvidence(
        experiment_id="exp_a_c",
        components=("A", "C"),
        summary="A+C combines well and beats either component alone.",
        signals={"score": 0.765, "accuracy": 0.75, "loss": 1.6, "runtime_ms": 22, "tests_passed": True},
        raw={"shape": "standard", "eval_status": "ok", "components": ["A", "C"]},
    ),
    ("bad",): MicrogradEvidence(
        experiment_id="exp_bad",
        components=("bad",),
        summary="Suspicious result: huge score jump with changed evidence shape.",
        signals={"score": 0.999},
        raw={"shape": "changed", "eval_status": "ok", "components": ["bad"]},
    ),
}
