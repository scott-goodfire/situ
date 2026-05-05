from __future__ import annotations

from typing import Any

from situ.protocol import ExperimentRunParams
from dbos import DBOS
from pydantic import BaseModel, Field
from pydantic_ai import RunContext

from ....core.trust import check_result
from ....records.base import DbRecord
from ...common import SituToolDeps, BaseSituTool
from .models import RunExperimentResult


class RunExperimentPayload(BaseModel):
    title: str
    summary: str
    experiment_id: str | None = None
    hypothesis_ids: list[str] = Field(default_factory=list)
    components: list[str] = Field(default_factory=list)
    based_on: list[str] = Field(default_factory=list)


class RunExperimentTool(BaseSituTool[SituToolDeps, RunExperimentResult]):
    name = "run_experiment"
    result_type = RunExperimentResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        summary: str,
        experiment_id: str | None = None,
        hypothesis_ids: list[str] | None = None,
        components: list[str] | None = None,
        based_on: list[str] | None = None,
        **_kwargs: Any,
    ) -> RunExperimentResult:
        """Run a concrete experiment through the configured worker path."""
        payload = RunExperimentPayload(
            title=title,
            summary=summary,
            experiment_id=experiment_id,
            hypothesis_ids=hypothesis_ids or [],
            components=components or [],
            based_on=based_on or [],
        )
        if (
            ctx.deps.repos is not None
            or ctx.deps.worker_manager is not None
            or ctx.deps.emit_event is not None
        ):
            return _run_experiment_impl(ctx.deps, payload)
        return run_experiment_step(ctx.deps.model_dump(), payload.model_dump())


@DBOS.step(name="situ.tool.run_experiment")
def run_experiment_step(
    raw_deps: dict[str, Any],
    raw_payload: dict[str, Any],
) -> RunExperimentResult:
    deps = SituToolDeps.model_validate(raw_deps)
    payload = RunExperimentPayload.model_validate(raw_payload)
    return _run_experiment_impl(deps, payload)


def _run_experiment_impl(
    deps: SituToolDeps,
    payload: RunExperimentPayload,
) -> RunExperimentResult:
    repos = deps.get_repos()
    session = repos.sessions.get(deps.session_id)
    if session is None:
        raise ValueError(f"session not found: {deps.session_id}")

    experiment_id = payload.experiment_id or _next_experiment_id(deps=deps)

    experiment = repos.experiments.get(experiment_id)
    if experiment is None:
        experiment = repos.experiments.create(
            experiment_id=experiment_id,
            session_id=deps.session_id,
            title=payload.title,
            summary=payload.summary,
            status="open",
        )
        event = deps.record_event(
            "experiment.created",
            f"Created experiment {experiment.id}",
            payload={"experiment_id": experiment.id, "components": payload.components},
        )
        _upsert(deps, experiment, event)

    for hypothesis_id in payload.hypothesis_ids:
        link = repos.hypothesis_experiment_links.create(
            hypothesis_id=hypothesis_id,
            experiment_id=experiment_id,
        )
        event = deps.record_event(
            "hypothesis.experiment_linked",
            f"Linked {hypothesis_id} to {experiment_id}",
            payload=link.model_dump(),
        )
        _upsert(deps, link, event)

    _record_experiment_activity(
        deps,
        experiment_id=experiment_id,
        actor="agent",
        body=payload.summary,
        payload={
            "activity_type": "plan",
            "components": payload.components,
            "based_on": payload.based_on,
        },
    )

    active = repos.experiments.update(experiment_id, status="active") or experiment
    event = deps.record_event(
        "experiment.started",
        f"Started experiment {experiment_id}",
        payload={"experiment_id": experiment_id},
    )
    _upsert(deps, active, event)

    worker_result = deps.get_worker_manager().run_experiment(
        ExperimentRunParams(
            session_id=deps.session_id,
            experiment_id=experiment_id,
            title=payload.title,
            summary=payload.summary,
            components=payload.components,
            based_on=payload.based_on,
        ),
        on_progress=lambda notification: _record_worker_progress(deps, notification),
    )

    _record_experiment_activity(
        deps,
        experiment_id=experiment_id,
        actor="worker",
        body=worker_result.summary,
        payload={
            "activity_type": "result",
            "status": worker_result.status,
            "signals": worker_result.signals,
            "raw": worker_result.raw,
        },
    )

    concerns = check_result(
        known_signals=[],
        baseline_score=baseline_score(deps, deps.session_id),
        signals=worker_result.signals,
        raw=worker_result.raw,
    )
    for kind, message in concerns:
        _record_experiment_activity(
            deps,
            experiment_id=experiment_id,
            actor="harness",
            body=f"{experiment_id}: {message}",
            payload={"activity_type": "concern", "concern_kind": kind},
        )

    linked_hypotheses = repos.hypothesis_experiment_links.list_for_experiment(experiment_id)
    for link in linked_hypotheses:
        _record_hypothesis_activity(
            deps,
            hypothesis_id=link.hypothesis_id,
            actor="harness",
            body=interpret_result(experiment_id, worker_result.summary, concerns),
            payload={
                "activity_type": "interpretation",
                "experiment_id": experiment_id,
                "concern_count": len(concerns),
            },
        )

    closed = repos.experiments.update(experiment_id, status="closed") or active
    event = deps.record_event(
        "experiment.completed",
        f"Completed experiment {experiment_id}",
        payload={"experiment_id": experiment_id, "concern_count": len(concerns)},
    )
    _upsert(deps, closed, event)

    return RunExperimentResult(
        success=True,
        experiment=closed.model_dump(),
        result=worker_result.model_dump(),
        concerns=[
            {"kind": kind, "message": message}
            for kind, message in concerns
        ],
    )


def _record_worker_progress(deps: SituToolDeps, notification: dict[str, Any]) -> None:
    params = notification.get("params") or {}
    deps.record_event(
        "worker.progress",
        str(params.get("message", "worker progress")),
        payload=params,
    )


def _record_experiment_activity(
    deps: SituToolDeps,
    *,
    experiment_id: str,
    actor: str,
    body: str,
    payload: dict[str, Any],
) -> None:
    activity = deps.get_repos().experiment_activities.add(
        experiment_id=experiment_id,
        actor=actor,
        kind="comment",
        body=body,
        payload=payload,
    )
    event = deps.record_event(
        "experiment.activity_recorded",
        body,
        payload={"activity_id": activity.id, "experiment_id": experiment_id},
    )
    _upsert(deps, activity, event)


def _record_hypothesis_activity(
    deps: SituToolDeps,
    *,
    hypothesis_id: str,
    actor: str,
    body: str,
    payload: dict[str, Any],
) -> None:
    activity = deps.get_repos().hypothesis_activities.add(
        hypothesis_id=hypothesis_id,
        actor=actor,
        kind="comment",
        body=body,
        payload=payload,
    )
    event = deps.record_event(
        "hypothesis.activity_recorded",
        body,
        payload={"activity_id": activity.id, "hypothesis_id": hypothesis_id},
    )
    _upsert(deps, activity, event)


def _upsert(
    deps: SituToolDeps,
    record: DbRecord,
    event: dict[str, Any] | None,
) -> None:
    deps.publish_record(record, event=event)


def _next_experiment_id(
    *,
    deps: SituToolDeps,
) -> str:
    repos = deps.get_repos()
    count = len(repos.experiments.list_for_session(deps.session_id)) + 1
    return f"exp_{deps.session_id}_agent_{count:03d}"


def baseline_score(deps: SituToolDeps, session_id: str) -> float | None:
    baseline_id = f"exp_{session_id}_baseline"
    activities = deps.get_repos().experiment_activities.list_for_experiment(baseline_id)
    for activity in reversed(activities):
        if activity.payload.get("activity_type") != "result" and "signals" not in activity.payload:
            continue
        signals = activity.payload.get("signals", [])
        if not isinstance(signals, list):
            continue
        for signal in signals:
            if not isinstance(signal, dict):
                continue
            value = signal.get("value") if signal.get("key") == "score" else None
            if isinstance(value, int | float):
                return float(value)
    return None


def interpret_result(
    experiment_id: str,
    summary: str,
    concerns: list[tuple[str, str]],
) -> str:
    if concerns:
        return f"{experiment_id} produced concerns; keep the result visible but do not trust it blindly."
    return f"{experiment_id} completed: {summary}"
