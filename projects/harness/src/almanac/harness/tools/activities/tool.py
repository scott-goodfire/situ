from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ..common import AlmanacToolDeps, BaseAlmanacTool
from .models import (
    ActivityKind,
    RecordExperimentActivityResult,
    RecordHypothesisActivityResult,
)


class RecordHypothesisActivityTool(
    BaseAlmanacTool[AlmanacToolDeps, RecordHypothesisActivityResult]
):
    name = "record_hypothesis_activity"
    result_type = RecordHypothesisActivityResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        hypothesis_id: str,
        body: str,
        kind: ActivityKind = "update",
        actor: str = "agent",
        payload: dict[str, Any] | None = None,
    ) -> RecordHypothesisActivityResult:
        activity = ctx.deps.repos.hypothesis_activities.add(
            hypothesis_id=hypothesis_id,
            session_id=ctx.deps.session_id,
            actor=actor,
            kind=kind,
            body=body,
            payload=payload or {},
        )
        ctx.deps.record_event(
            "hypothesis.activity_recorded",
            body,
            payload={"activity_id": activity.id, "hypothesis_id": hypothesis_id, "kind": kind},
        )
        return RecordHypothesisActivityResult(success=True, activity=activity.model_dump())


class RecordExperimentActivityTool(
    BaseAlmanacTool[AlmanacToolDeps, RecordExperimentActivityResult]
):
    name = "record_experiment_activity"
    result_type = RecordExperimentActivityResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        experiment_id: str,
        body: str,
        kind: ActivityKind = "update",
        actor: str = "agent",
        payload: dict[str, Any] | None = None,
    ) -> RecordExperimentActivityResult:
        activity = ctx.deps.repos.experiment_activities.add(
            experiment_id=experiment_id,
            session_id=ctx.deps.session_id,
            actor=actor,
            kind=kind,
            body=body,
            payload=payload or {},
        )
        ctx.deps.record_event(
            "experiment.activity_recorded",
            body,
            payload={"activity_id": activity.id, "experiment_id": experiment_id, "kind": kind},
        )
        return RecordExperimentActivityResult(success=True, activity=activity.model_dump())
