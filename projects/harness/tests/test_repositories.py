from __future__ import annotations

from pathlib import Path

import pytest
from almanac.protocol import StateSnapshotResult
from almanac.harness.db import Database, Repositories


@pytest.fixture
def repos(tmp_path: Path) -> Repositories:
    db = Database(
        tmp_path / "almanac.sqlite",
        project_id="project_test",
        repo_path="/tmp/project",
    )
    return Repositories.create(db)


def create_project_config(repos: Repositories) -> dict:
    return repos.project_config.set(
        goal="Improve score",
        evaluation_context="Run a JSON eval.",
        known_signals=["score", "latency_ms"],
        experiment_scope="Baseline and variants.",
    )


def create_run(repos: Repositories, run_id: str = "run_0001") -> dict:
    create_project_config(repos)
    return repos.runs.create(run_id)


def create_experiment(repos: Repositories, experiment_id: str = "exp_run_0001_a") -> dict:
    create_run(repos)
    return repos.experiments.create(
        experiment_id=experiment_id,
        run_id="run_0001",
        intent="Try component A.",
        change_summary="Apply component A.",
        components=["A"],
        based_on=["exp_run_0001_baseline"],
    )


def test_project_config_repository_set_get_and_update(repos: Repositories) -> None:
    config = create_project_config(repos)

    assert config["id"] == "project_test"
    assert config["repo_path"] == "/tmp/project"
    assert config["goal"] == "Improve score"
    assert config["known_signals"] == ["score", "latency_ms"]
    created_at = config["created_at"]

    updated = repos.project_config.set(
        goal="Improve score safely",
        evaluation_context="Run a JSON eval with guardrails.",
        known_signals=["score"],
        experiment_scope="Baseline only.",
    )

    assert updated["goal"] == "Improve score safely"
    assert updated["known_signals"] == ["score"]
    assert updated["created_at"] == created_at
    assert repos.project_config.get() == updated


def test_runs_repository_create_update_get_and_list(repos: Repositories) -> None:
    create_project_config(repos)

    run = repos.runs.create("run_0001")
    assert run["id"] == "run_0001"
    assert run["status"] == "running"

    updated = repos.runs.update_status("run_0001", "completed")
    assert updated is not None
    assert updated["status"] == "completed"
    assert repos.runs.get("run_0001") == updated
    assert [item["id"] for item in repos.runs.list_all()] == ["run_0001"]


def test_experiments_repository_create_update_get_and_list(repos: Repositories) -> None:
    experiment = create_experiment(repos)

    assert experiment["id"] == "exp_run_0001_a"
    assert experiment["status"] == "queued"
    assert experiment["components"] == ["A"]
    assert experiment["based_on"] == ["exp_run_0001_baseline"]

    updated = repos.experiments.update(
        "exp_run_0001_a",
        status="suspicious",
        suspicious=True,
        suspicious_reason="missing signal",
        note="review this",
    )
    assert updated is not None
    assert updated["status"] == "suspicious"
    assert updated["suspicious"] is True
    assert updated["suspicious_reason"] == "missing signal"
    assert updated["note"] == "review this"
    assert repos.experiments.get("exp_run_0001_a") == updated
    assert [item["id"] for item in repos.experiments.list_for_run("run_0001")] == ["exp_run_0001_a"]
    assert [item["id"] for item in repos.experiments.list_all()] == ["exp_run_0001_a"]


def test_evidence_repository_add_list_and_get_for_experiment(repos: Repositories) -> None:
    create_experiment(repos)

    evidence = repos.evidence.add(
        run_id="run_0001",
        experiment_id="exp_run_0001_a",
        summary="A improved score.",
        signals=[
            {"key": "score", "value": 0.73},
            {"key": "latency_ms", "value": 105, "unit": "ms"},
        ],
        raw={"shape": "standard", "eval_status": "ok"},
    )

    assert evidence["id"] == 1
    assert evidence["summary"] == "A improved score."
    assert evidence["signals"][0]["key"] == "score"
    assert evidence["raw"]["shape"] == "standard"
    assert repos.evidence.get_for_experiment("exp_run_0001_a") == evidence
    assert repos.evidence.list_for_run("run_0001") == [evidence]
    assert repos.evidence.list_all() == [evidence]


def test_findings_repository_upsert_get_and_list(repos: Repositories) -> None:
    create_run(repos)

    finding = repos.findings.upsert(
        finding_id="run_0001_F-001",
        run_id="run_0001",
        summary="A improved over baseline.",
        evidence_experiment_ids=["exp_run_0001_a"],
        confidence="low",
        status="open",
    )
    created_at = finding["created_at"]

    updated = repos.findings.upsert(
        finding_id="run_0001_F-001",
        run_id="run_0001",
        summary="A and C improved over baseline.",
        evidence_experiment_ids=["exp_run_0001_a", "exp_run_0001_c"],
        confidence="medium",
        status="supported",
    )

    assert updated["summary"] == "A and C improved over baseline."
    assert updated["evidence_experiment_ids"] == ["exp_run_0001_a", "exp_run_0001_c"]
    assert updated["confidence"] == "medium"
    assert updated["status"] == "supported"
    assert updated["created_at"] == created_at
    assert repos.findings.get("run_0001_F-001") == updated
    assert repos.findings.list_for_run("run_0001") == [updated]
    assert repos.findings.list_all() == [updated]


def test_warnings_repository_add_and_list(repos: Repositories) -> None:
    create_experiment(repos)

    warning = repos.warnings.add(
        run_id="run_0001",
        experiment_id="exp_run_0001_a",
        kind="missing_signal",
        message="Expected signal missing: score",
    )

    assert warning["id"] == 1
    assert warning["kind"] == "missing_signal"
    assert warning["message"] == "Expected signal missing: score"
    assert repos.warnings.list_for_run("run_0001") == [warning]
    assert repos.warnings.list_all() == [warning]


def test_events_repository_add_and_list(repos: Repositories) -> None:
    create_run(repos)

    event = repos.events.add(
        event_type="run.started",
        message="Started run_0001",
        run_id="run_0001",
        payload={"run_id": "run_0001"},
    )

    assert event["id"] == 1
    assert event["type"] == "run.started"
    assert event["payload"] == {"run_id": "run_0001"}
    assert repos.events.list_for_run("run_0001") == [event]
    assert repos.events.list_all() == [event]


def test_snapshots_repository_composes_protocol_shaped_state(repos: Repositories) -> None:
    create_experiment(repos)
    repos.evidence.add(
        run_id="run_0001",
        experiment_id="exp_run_0001_a",
        summary="A improved score.",
        signals=[{"key": "score", "value": 0.73}],
        raw={"shape": "standard", "eval_status": "ok"},
    )
    repos.findings.upsert(
        finding_id="run_0001_F-001",
        run_id="run_0001",
        summary="A improved over baseline.",
        evidence_experiment_ids=["exp_run_0001_a"],
        confidence="low",
        status="open",
    )
    repos.warnings.add(
        run_id="run_0001",
        experiment_id="exp_run_0001_a",
        kind="missing_signal",
        message="Expected signal missing: latency_ms",
    )
    repos.events.add(
        event_type="experiment.completed",
        message="Completed exp_run_0001_a",
        run_id="run_0001",
        payload={"experiment_id": "exp_run_0001_a"},
    )

    snapshot = repos.snapshots.get()
    parsed = StateSnapshotResult.model_validate(snapshot)

    assert parsed.config is not None
    assert parsed.config.id == "project_test"
    assert [run.id for run in parsed.runs] == ["run_0001"]
    assert [experiment.id for experiment in parsed.experiments] == ["exp_run_0001_a"]
    assert [evidence.experiment_id for evidence in parsed.evidence] == ["exp_run_0001_a"]
    assert [finding.id for finding in parsed.findings] == ["run_0001_F-001"]
    assert [warning.kind for warning in parsed.warnings] == ["missing_signal"]
    assert [event.type for event in parsed.events] == ["experiment.completed"]
