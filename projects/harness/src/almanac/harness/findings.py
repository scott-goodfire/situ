from __future__ import annotations

from typing import Any

from .db import Repositories


def update_findings(repos: Repositories, run_id: str) -> None:
    snapshot = repos.snapshots.get()
    experiments = [
        experiment
        for experiment in snapshot["experiments"]
        if experiment["run_id"] == run_id and experiment["status"] == "completed" and not experiment["suspicious"]
    ]
    evidence_by_experiment = {
        evidence["experiment_id"]: evidence
        for evidence in snapshot["evidence"]
        if evidence["run_id"] == run_id
    }

    baseline_score = _score(evidence_by_experiment.get(f"exp_{run_id}_baseline"))
    if baseline_score is None:
        return

    improved: list[tuple[dict[str, Any], float]] = []
    for experiment in experiments:
        if experiment["components"] == ["baseline"]:
            continue
        score = _score(evidence_by_experiment.get(experiment["id"]))
        if score is not None and score > baseline_score:
            improved.append((experiment, score))

    if improved:
        best = max(improved, key=lambda item: item[1])
        repos.findings.upsert(
            finding_id=f"{run_id}_F-001",
            run_id=run_id,
            summary=(
                f"{len(improved)} non-suspicious experiments improved score over baseline; "
                f"{best[0]['id']} is strongest so far."
            ),
            evidence_experiment_ids=[experiment["id"] for experiment, _ in improved],
            confidence="medium" if len(improved) >= 2 else "low",
            status="supported",
        )

    component_c = [
        experiment["id"]
        for experiment, score in improved
        if "C" in experiment["components"] and score > baseline_score + 0.02
    ]
    if component_c:
        repos.findings.upsert(
            finding_id=f"{run_id}_F-002",
            run_id=run_id,
            summary="Component C looks promising across toy evidence.",
            evidence_experiment_ids=component_c,
            confidence="medium" if len(component_c) >= 2 else "low",
            status="supported",
        )

    combination = [
        experiment["id"]
        for experiment, score in improved
        if len(experiment["components"]) > 1 and score > baseline_score + 0.04
    ]
    if combination:
        repos.findings.upsert(
            finding_id=f"{run_id}_F-003",
            run_id=run_id,
            summary="Combining components can outperform single changes in the toy loop.",
            evidence_experiment_ids=combination,
            confidence="medium",
            status="open",
        )


def _score(evidence: dict[str, Any] | None) -> float | None:
    if evidence is None:
        return None
    for signal in evidence["signals"]:
        if signal["key"] == "score" and isinstance(signal["value"], int | float):
            return float(signal["value"])
    return None
