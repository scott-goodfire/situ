from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from almanac.harness.db import Database, Repositories
from almanac.harness.tools.common import AlmanacToolDeps, invoke_almanac_tool_sync
from almanac.harness.tools.findings import RecordFindingTool
from almanac.harness.tools.run_context import GetRunContextTool


@pytest.fixture
def repos(tmp_path: Path) -> Repositories:
    db = Database(
        tmp_path / "almanac.sqlite",
        project_id="project_test",
        repo_path="/tmp/project",
    )
    repositories = Repositories.create(db)
    repositories.project_config.set(
        goal="Improve score",
        evaluation_context="Run a JSON eval.",
        known_signals=["score"],
        experiment_scope="Baseline and variants.",
    )
    repositories.runs.create("run_0001")
    return repositories


def test_get_run_context_tool_reads_current_run(repos: Repositories) -> None:
    deps = AlmanacToolDeps(run_id="run_0001", repos=repos)

    result = invoke_almanac_tool_sync(tool=GetRunContextTool(), deps=deps)

    assert result.success is True
    assert result.config is not None
    assert result.config["goal"] == "Improve score"
    assert result.run is not None
    assert result.run["id"] == "run_0001"


def test_record_finding_tool_writes_finding_and_event(repos: Repositories) -> None:
    emitted: list[dict[str, Any]] = []

    def emit_event(
        event_type: str,
        message: str,
        run_id: str | None,
        payload: dict[str, Any] | None,
    ) -> dict[str, Any]:
        event = {
            "type": event_type,
            "message": message,
            "run_id": run_id,
            "payload": payload or {},
        }
        emitted.append(event)
        return event

    deps = AlmanacToolDeps(run_id="run_0001", repos=repos, emit_event=emit_event)

    result = invoke_almanac_tool_sync(
        tool=RecordFindingTool(),
        deps=deps,
        summary="Component A looks promising.",
        evidence_experiment_ids=["exp_run_0001_a"],
        confidence="medium",
        status="open",
    )

    assert result.success is True
    assert result.finding is not None
    assert result.finding["summary"] == "Component A looks promising."
    assert result.finding["confidence"] == "medium"
    assert repos.findings.list_for_run("run_0001") == [result.finding]
    assert emitted == [
        {
            "type": "finding.recorded",
            "message": "Component A looks promising.",
            "run_id": "run_0001",
            "payload": {
                "finding_id": result.finding["id"],
                "confidence": "medium",
            },
        }
    ]
