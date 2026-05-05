from __future__ import annotations

import re
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from almanac.protocol import ExperimentRunParams, ExperimentRunResult
from dbos import DBOS, Queue, SetEnqueueOptions, SetWorkflowID
from pydantic import BaseModel, ConfigDict

from ....agent_runtime import get_agent_runtime
from ....api.current_state import CurrentStateService
from ....core.db import Database
from ....core.dbos.notifications import emit_collection_upsert, emit_project_event
from ....core.trust import check_result
from ....core.workers import WorkerManager
from ....observability import span
from ....repositories import Repositories


SESSION_QUEUE = Queue("almanac-session", concurrency=1)


class ProcessSessionWorkflowArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str
    project_dir: str
    repo_path: str
    app_root: str | None
    session_id: str
    max_experiments: int


@dataclass(frozen=True)
class Proposal:
    suffix: str
    title: str
    summary: str
    components: list[str]
    based_on_suffixes: list[str]

    def to_payload(self) -> dict[str, Any]:
        return {
            "suffix": self.suffix,
            "title": self.title,
            "summary": self.summary,
            "components": self.components,
            "based_on_suffixes": self.based_on_suffixes,
        }


PROPOSALS = [
    Proposal(
        suffix="baseline",
        title="Record baseline",
        summary="Run the toy baseline without extra components.",
        components=["baseline"],
        based_on_suffixes=[],
    ),
    Proposal(
        suffix="a",
        title="Try component A",
        summary="Apply toy component A on its own.",
        components=["A"],
        based_on_suffixes=["baseline"],
    ),
    Proposal(
        suffix="b",
        title="Try component B",
        summary="Apply toy component B on its own.",
        components=["B"],
        based_on_suffixes=["baseline"],
    ),
    Proposal(
        suffix="c",
        title="Try component C",
        summary="Apply toy component C on its own.",
        components=["C"],
        based_on_suffixes=["baseline"],
    ),
    Proposal(
        suffix="a_c",
        title="Combine components A and C",
        summary="Apply toy components A + C together.",
        components=["A", "C"],
        based_on_suffixes=["a", "c"],
    ),
    Proposal(
        suffix="bad",
        title="Demonstrate suspicious result handling",
        summary="Return a suspicious toy result so automated trust checks create a concern.",
        components=["bad"],
        based_on_suffixes=["baseline"],
    ),
]


@DBOS.workflow(name="almanac.process_session")
def process_session_workflow(raw_args: dict[str, Any]) -> None:
    args = ProcessSessionWorkflowArgs.model_validate(raw_args)
    try:
        hypothesis_id = ensure_seed_hypothesis_step(args.model_dump())
        record_agent_plan_step(args.model_dump(), hypothesis_id)
        with span("almanac.session.execute", session_id=args.session_id, workspace=args.repo_path):
            for proposal in PROPOSALS[: args.max_experiments]:
                payload = proposal.to_payload()
                experiment_id = create_experiment_step(args.model_dump(), hypothesis_id, payload)
                result = run_worker_step(args.model_dump(), payload)
                record_experiment_result_step(
                    args.model_dump(),
                    hypothesis_id,
                    experiment_id,
                    result,
                )
                DBOS.sleep(0.25)
        complete_session_step(args.model_dump())
    except Exception as error:
        fail_session_step(args.model_dump(), str(error))
        raise


def enqueue_process_session(args: ProcessSessionWorkflowArgs) -> Any:
    workflow_id = f"almanac:session:{args.project_id}:{args.session_id}"
    dedupe_id = f"{args.project_id}:{args.session_id}"
    with SetWorkflowID(workflow_id), SetEnqueueOptions(
        deduplication_id=dedupe_id,
        queue_partition_key=args.project_id,
    ):
        return SESSION_QUEUE.enqueue(process_session_workflow, args.model_dump())


@DBOS.step(name="almanac.ensure_seed_hypothesis")
def ensure_seed_hypothesis_step(raw_args: dict[str, Any]) -> str:
    args = ProcessSessionWorkflowArgs.model_validate(raw_args)
    with open_repositories(args) as repos:
        objective = repos.objectives.get_active()
        if objective is None:
            raise RuntimeError("missing active objective")

        hypothesis_id = f"hyp_{objective.id}_toy_components"
        existing = repos.hypotheses.get(hypothesis_id)
        if existing is not None:
            if existing.status != "active":
                updated = repos.hypotheses.update(hypothesis_id, status="active")
                if updated is not None:
                    event = record_event(
                        args,
                        repos,
                        "hypothesis.updated",
                        f"Activated hypothesis {updated.id}",
                        payload={"hypothesis_id": updated.id},
                    )
                    upsert(args, "hypotheses", updated.id, updated.model_dump(), cursor=event.id)
            return existing.id

        hypothesis = repos.hypotheses.create(
            hypothesis_id=hypothesis_id,
            objective_id=objective.id,
            title="Toy components can improve the score",
            summary="Compare baseline, individual components, and simple combinations.",
            status="active",
            associated_session_id=args.session_id,
        )
        event = record_event(
            args,
            repos,
            "hypothesis.created",
            f"Created hypothesis {hypothesis.id}",
            payload={"hypothesis_id": hypothesis.id},
        )
        upsert(args, "hypotheses", hypothesis.id, hypothesis.model_dump(), cursor=event.id)
        record_hypothesis_activity(
            args,
            repos,
            hypothesis_id=hypothesis.id,
            actor="harness",
            body="Seeded the first hypothesis for the deterministic toy loop.",
            payload={"objective_id": objective.id},
        )
        return hypothesis.id


@DBOS.step(name="almanac.record_agent_plan")
def record_agent_plan_step(raw_args: dict[str, Any], hypothesis_id: str) -> None:
    args = ProcessSessionWorkflowArgs.model_validate(raw_args)
    with open_repositories(args) as repos:
        config = repos.project_config.get()
        objective = repos.objectives.get_active()
        if config is None or objective is None:
            raise RuntimeError("missing project setup")

        try:
            runtime = get_agent_runtime(Path(args.project_dir))
            plan = runtime.plan_session(
                config=config.model_dump(),
                objective=objective.model_dump(),
                current_state=CurrentStateService(repos=repos).get().model_dump(),
                session_id=args.session_id,
                repos=repos,
            )
        except Exception as error:
            record_hypothesis_activity(
                args,
                repos,
                hypothesis_id=hypothesis_id,
                actor="harness",
                body=f"Agent runtime failed: {error}",
                payload={"activity_type": "concern", "error": str(error)},
            )
            return

        record_hypothesis_activity(
            args,
            repos,
            hypothesis_id=hypothesis_id,
            actor="agent",
            body=plan.summary,
            payload={"activity_type": "plan", **plan.model_dump()},
        )


@DBOS.step(name="almanac.create_experiment")
def create_experiment_step(
    raw_args: dict[str, Any],
    hypothesis_id: str,
    proposal: dict[str, Any],
) -> str:
    args = ProcessSessionWorkflowArgs.model_validate(raw_args)
    with open_repositories(args) as repos:
        objective = repos.objectives.get_active()
        if objective is None:
            raise RuntimeError("missing active objective")

        experiment_id = f"exp_{args.session_id}_{proposal['suffix']}"
        based_on = [f"exp_{args.session_id}_{suffix}" for suffix in proposal["based_on_suffixes"]]
        existing = repos.experiments.get(experiment_id)
        if existing is None:
            experiment = repos.experiments.create(
                experiment_id=experiment_id,
                objective_id=objective.id,
                title=proposal["title"],
                summary=proposal["summary"],
                associated_session_id=args.session_id,
                status="open",
            )
            event = record_event(
                args,
                repos,
                "experiment.created",
                f"Created {experiment_id}",
                payload={"experiment_id": experiment_id, "components": proposal["components"]},
            )
            upsert(args, "experiments", experiment_id, experiment.model_dump(), cursor=event.id)
        else:
            experiment = existing

        link = repos.hypothesis_experiment_links.create(
            hypothesis_id=hypothesis_id,
            experiment_id=experiment_id,
        )
        event = record_event(
            args,
            repos,
            "hypothesis.experiment_linked",
            f"Linked {experiment_id} to {hypothesis_id}",
            payload=link.model_dump(),
        )
        upsert(
            args,
            "hypothesis_experiment_links",
            f"{link.hypothesis_id}:{link.experiment_id}",
            link.model_dump(),
            cursor=event.id,
        )

        if not repos.experiment_activities.list_for_experiment(experiment_id):
            record_experiment_activity(
                args,
                repos,
                experiment_id=experiment_id,
                actor="harness",
                body=proposal["summary"],
                payload={"components": proposal["components"], "based_on": based_on},
            )

        updated = repos.experiments.update(experiment_id, status="active") or experiment
        event = record_event(
            args,
            repos,
            "experiment.started",
            f"Started {experiment_id}",
            payload={"experiment_id": experiment_id},
        )
        upsert(args, "experiments", experiment_id, updated.model_dump(), cursor=event.id)
        return experiment_id


@DBOS.step(name="almanac.run_worker")
def run_worker_step(raw_args: dict[str, Any], proposal: dict[str, Any]) -> dict[str, Any]:
    args = ProcessSessionWorkflowArgs.model_validate(raw_args)
    with open_repositories(args) as repos:
        objective = repos.objectives.get_active()
        if objective is None:
            raise RuntimeError("missing active objective")
        experiment_id = f"exp_{args.session_id}_{proposal['suffix']}"
        based_on = [f"exp_{args.session_id}_{suffix}" for suffix in proposal["based_on_suffixes"]]

    manager = WorkerManager(
        Path(args.repo_path),
        app_root=Path(args.app_root) if args.app_root is not None else None,
    )
    result = manager.run_experiment(
        ExperimentRunParams(
            session_id=args.session_id,
            objective_id=objective.id,
            experiment_id=experiment_id,
            title=proposal["title"],
            summary=proposal["summary"],
            components=proposal["components"],
            based_on=based_on,
        ),
        on_progress=lambda notification: record_worker_progress(args, notification),
    )
    return result.model_dump()


@DBOS.step(name="almanac.record_experiment_result")
def record_experiment_result_step(
    raw_args: dict[str, Any],
    hypothesis_id: str,
    experiment_id: str,
    raw_result: dict[str, Any],
) -> None:
    args = ProcessSessionWorkflowArgs.model_validate(raw_args)
    result = ExperimentRunResult.model_validate(raw_result)
    with open_repositories(args) as repos:
        config = repos.project_config.get()
        if config is None:
            raise RuntimeError("missing project setup")

        signals = result.signals
        record_experiment_activity(
            args,
            repos,
            experiment_id=experiment_id,
            actor="worker",
            body=result.summary,
            payload={
                "activity_type": "result",
                "status": result.status,
                "signals": signals,
                "raw": result.raw,
            },
        )

        concerns = check_result(
            known_signals=expected_signals(config.research_context),
            baseline_score=baseline_score(repos, args.session_id),
            signals=signals,
            raw=result.raw,
        )
        for kind, message in concerns:
            record_experiment_activity(
                args,
                repos,
                experiment_id=experiment_id,
                actor="harness",
                body=f"{experiment_id}: {message}",
                payload={"activity_type": "concern", "concern_kind": kind},
            )

        record_hypothesis_activity(
            args,
            repos,
            hypothesis_id=hypothesis_id,
            actor="harness",
            body=interpret_result(experiment_id, result.summary, concerns),
            payload={
                "activity_type": "interpretation",
                "experiment_id": experiment_id,
                "concern_count": len(concerns),
            },
        )

        experiment = repos.experiments.update(experiment_id, status="closed")
        event = record_event(
            args,
            repos,
            "experiment.completed",
            f"Completed {experiment_id}",
            payload={"experiment_id": experiment_id, "concern_count": len(concerns)},
        )
        if experiment is not None:
            upsert(args, "experiments", experiment_id, experiment.model_dump(), cursor=event.id)


@DBOS.step(name="almanac.complete_session")
def complete_session_step(raw_args: dict[str, Any]) -> None:
    args = ProcessSessionWorkflowArgs.model_validate(raw_args)
    with open_repositories(args) as repos:
        session = repos.sessions.update_status(args.session_id, "closed")
        event = record_event(args, repos, "session.completed", f"Completed {args.session_id}")
        if session is not None:
            upsert(args, "sessions", args.session_id, session.model_dump(), cursor=event.id)


@DBOS.step(name="almanac.fail_session")
def fail_session_step(raw_args: dict[str, Any], message: str) -> None:
    args = ProcessSessionWorkflowArgs.model_validate(raw_args)
    with open_repositories(args) as repos:
        session = repos.sessions.update_status(args.session_id, "closed")
        event = record_event(
            args,
            repos,
            "session.failed",
            f"Session failed: {message}",
            payload={"error": message},
        )
        if session is not None:
            upsert(args, "sessions", args.session_id, session.model_dump(), cursor=event.id)


@contextmanager
def open_repositories(args: ProcessSessionWorkflowArgs) -> Iterator[Repositories]:
    db = Database(
        Path(args.project_dir) / "almanac.sqlite",
        project_id=args.project_id,
        repo_path=args.repo_path,
    )
    try:
        yield Repositories.create(db)
    finally:
        db.close()


def record_worker_progress(args: ProcessSessionWorkflowArgs, notification: dict[str, Any]) -> None:
    with open_repositories(args) as repos:
        params = notification.get("params") or {}
        record_event(
            args,
            repos,
            "worker.progress",
            str(params.get("message", "worker progress")),
            payload=params,
        )


def record_hypothesis_activity(
    args: ProcessSessionWorkflowArgs,
    repos: Repositories,
    *,
    hypothesis_id: str,
    actor: str,
    body: str,
    payload: dict[str, Any] | None = None,
) -> None:
    activity = repos.hypothesis_activities.add(
        hypothesis_id=hypothesis_id,
        session_id=args.session_id,
        actor=actor,
        kind="comment",
        body=body,
        payload=payload,
    )
    event = record_event(
        args,
        repos,
        "hypothesis.activity_recorded",
        body,
        payload={"activity_id": activity.id, "hypothesis_id": hypothesis_id, "kind": "comment"},
    )
    upsert(args, "hypothesis_activities", str(activity.id), activity.model_dump(), cursor=event.id)


def record_experiment_activity(
    args: ProcessSessionWorkflowArgs,
    repos: Repositories,
    *,
    experiment_id: str,
    actor: str,
    body: str,
    payload: dict[str, Any] | None = None,
) -> None:
    activity = repos.experiment_activities.add(
        experiment_id=experiment_id,
        session_id=args.session_id,
        actor=actor,
        kind="comment",
        body=body,
        payload=payload,
    )
    event = record_event(
        args,
        repos,
        "experiment.activity_recorded",
        body,
        payload={"activity_id": activity.id, "experiment_id": experiment_id, "kind": "comment"},
    )
    upsert(args, "experiment_activities", str(activity.id), activity.model_dump(), cursor=event.id)


def record_event(
    args: ProcessSessionWorkflowArgs,
    repos: Repositories,
    event_type: str,
    message: str,
    *,
    payload: dict[str, Any] | None = None,
) -> Any:
    event = repos.events.add(
        event_type=event_type,
        message=message,
        session_id=args.session_id,
        payload=payload,
    )
    event_dump = event.model_dump()
    emit_project_event(args.project_id, event_dump)
    upsert(args, "events", str(event.id), event_dump, cursor=event.id)
    return event


def upsert(
    args: ProcessSessionWorkflowArgs,
    collection: str,
    key: str,
    record: dict[str, Any],
    *,
    cursor: int,
) -> None:
    emit_collection_upsert(args.project_id, collection, key, record, cursor=cursor)


def baseline_score(repos: Repositories, session_id: str) -> float | None:
    baseline_id = f"exp_{session_id}_baseline"
    activities = repos.experiment_activities.list_for_experiment(baseline_id)
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


def expected_signals(research_context: str) -> list[str]:
    match = re.search(
        r"(?:expected|known)\s+signals?\s*:\s*([^\n.]+)",
        research_context,
        flags=re.IGNORECASE,
    )
    if match is None:
        return []
    signals = re.split(r",|\band\b", match.group(1), flags=re.IGNORECASE)
    return [signal.strip(" `.;") for signal in signals if signal.strip(" `.;")]


def interpret_result(
    experiment_id: str,
    summary: str,
    concerns: list[tuple[str, str]],
) -> str:
    if concerns:
        return f"{experiment_id} produced concerns; keep the result visible but do not trust it blindly."
    return f"{experiment_id} completed: {summary}"
