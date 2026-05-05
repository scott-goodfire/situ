from __future__ import annotations

import re
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from almanac.protocol import (
    CollectionsBootstrapParams,
    CollectionsBootstrapResult,
    CollectionsSubscribeParams,
    CollectionsSubscribeResult,
    EventsSubscribeParams,
    EventsSubscribeResult,
    ExperimentRunParams,
    HarnessHelloParams,
    HarnessHelloResult,
    SessionStartParams,
    SessionStartResult,
    SessionStatusParams,
    SessionStatusResult,
    SetupCompleteParams,
    SetupCompleteResult,
    SetupGetParams,
    SetupGetResult,
)

from .agent_runtime import AgentRuntime
from .api.collections import CollectionsService
from .api.current_state import CurrentStateService
from .api.sessions import SessionsService
from .core.db import Database
from .core.trust import check_result
from .core.workers import WorkerManager
from .observability import span
from .project_context import ProjectContext
from .records import EventRecord, HypothesisRecord, ObjectiveRecord, ProjectConfigRecord
from .repositories import Repositories

NotificationWriter = Callable[[str, dict[str, Any]], None]


@dataclass(frozen=True)
class Proposal:
    suffix: str
    title: str
    summary: str
    components: list[str]
    based_on_suffixes: list[str]


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


class HarnessApp:
    def __init__(
        self,
        workspace_root: Path,
        notify: NotificationWriter,
        app_root: Path | None = None,
        project_home: Path | None = None,
    ) -> None:
        self.context = ProjectContext(workspace_root, home=project_home)
        self.db = Database(
            self.context.project_dir / "almanac.sqlite",
            project_id=self.context.project_id,
            repo_path=str(self.context.repo_root),
        )
        self.repos = Repositories.create(self.db)
        self.collections_api = CollectionsService(repos=self.repos)
        self.current_state_api = CurrentStateService(repos=self.repos)
        self.sessions_api = SessionsService(repos=self.repos)
        self.workers = WorkerManager(self.context.repo_root, app_root=app_root)
        self.agent_runtime = AgentRuntime(self.context.project_dir)
        self.notify = notify
        self.subscribed = False
        self.collection_subscribed = False

    def handle(self, method: str, params: dict[str, Any] | None) -> dict[str, Any]:
        handlers = {
            "harness.hello": self.hello,
            "setup.get": self.setup_get,
            "setup.complete": self.setup_complete,
            "collections.bootstrap": self.collections_bootstrap,
            "collections.subscribe": self.collections_subscribe,
            "events.subscribe": self.events_subscribe,
            "session.start": self.session_start,
            "session.status": self.session_status,
        }
        handler = handlers.get(method)
        if handler is None:
            raise MethodNotFound(method)
        return handler(params or {})

    def hello(self, params: dict[str, Any]) -> dict[str, Any]:
        hello = HarnessHelloParams.model_validate(params)
        return HarnessHelloResult(message=f"hello, {hello.name} from the Python harness").model_dump()

    def setup_get(self, params: dict[str, Any]) -> dict[str, Any]:
        SetupGetParams.model_validate(params)
        config = self.repos.project_config.get()
        objective = self.repos.objectives.get_active()
        return SetupGetResult(
            configured=config is not None and objective is not None,
            config=config.model_dump() if config is not None else None,
            objective=objective.model_dump() if objective is not None else None,
        ).model_dump()

    def setup_complete(self, params: dict[str, Any]) -> dict[str, Any]:
        setup = SetupCompleteParams.model_validate(params)
        config = self.repos.project_config.set(
            research_context=setup.research_context,
        )
        objective = self.repos.objectives.upsert(
            objective_id="objective_0001",
            title=setup.objective,
            description=setup.objective,
            status="active",
            associated_session_id=None,
        )
        self.record_event(
            "setup.completed",
            "Configured project context",
            payload={
                "objective_id": objective.id,
                "objective": objective.title,
                "research_context": config.research_context,
            },
        )
        return SetupCompleteResult(
            config=config.model_dump(),
            objective=objective.model_dump(),
        ).model_dump()

    def collections_bootstrap(self, params: dict[str, Any]) -> dict[str, Any]:
        CollectionsBootstrapParams.model_validate(params)
        bootstrap = self.collections_api.bootstrap()
        return CollectionsBootstrapResult.model_validate(bootstrap.model_dump()).model_dump()

    def collections_subscribe(self, params: dict[str, Any]) -> dict[str, Any]:
        CollectionsSubscribeParams.model_validate(params)
        self.collection_subscribed = True
        return CollectionsSubscribeResult(
            subscribed=True,
            cursor=self.collections_api.current_cursor(),
        ).model_dump()

    def events_subscribe(self, params: dict[str, Any]) -> dict[str, Any]:
        subscribe = EventsSubscribeParams.model_validate(params)
        self.subscribed = True
        replayed = 0
        if subscribe.replay_existing:
            for event in self.repos.events.list_all():
                self.notify("event.appended", {"event": event.model_dump()})
                replayed += 1
        return EventsSubscribeResult(subscribed=True, replayed=replayed).model_dump()

    def session_start(self, params: dict[str, Any]) -> dict[str, Any]:
        start = SessionStartParams.model_validate(params)
        config = self.repos.project_config.get()
        objective = self.repos.objectives.get_active()
        if config is None or objective is None:
            raise RuntimeError("setup must be completed before starting a session")

        session_id = self.sessions_api.next_session_id().session_id
        session = self.repos.sessions.create(session_id, objective_id=objective.id)
        event = self.record_event("session.started", f"Started {session_id}", session_id=session_id)
        self.emit_collection_upsert("sessions", session_id, session.model_dump(), cursor=event.id)

        thread = threading.Thread(
            target=self._execute_session,
            args=(session_id, start.max_experiments),
            daemon=True,
        )
        thread.start()

        return SessionStartResult(session_id=session_id, status="active").model_dump()

    def session_status(self, params: dict[str, Any]) -> dict[str, Any]:
        status = SessionStatusParams.model_validate(params)
        session = self.repos.sessions.get(status.session_id)
        return SessionStatusResult(
            session=session.model_dump() if session is not None else None
        ).model_dump()

    def record_event(
        self,
        event_type: str,
        message: str,
        *,
        session_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> EventRecord:
        event = self.repos.events.add(
            event_type=event_type,
            message=message,
            session_id=session_id,
            payload=payload,
        )
        if self.subscribed:
            self.notify("event.appended", {"event": event.model_dump()})
        self.emit_collection_upsert("events", str(event.id), event.model_dump(), cursor=event.id)
        return event

    def emit_collection_upsert(
        self,
        collection: str,
        key: str,
        record: dict[str, Any],
        *,
        cursor: int,
    ) -> None:
        if not self.collection_subscribed:
            return
        self.notify(
            "collections.upserted",
            {
                "cursor": cursor,
                "collection": collection,
                "key": key,
                "record": record,
            },
        )

    def _execute_session(self, session_id: str, max_experiments: int) -> None:
        try:
            config = self.repos.project_config.get()
            objective = self.repos.objectives.get_active()
            if config is None or objective is None:
                raise RuntimeError("missing project setup")

            hypothesis = self._ensure_seed_hypothesis(session_id, objective)
            self._record_agent_plan(session_id, config, objective, hypothesis)

            with span("almanac.session.execute", session_id=session_id, workspace=config.repo_path):
                for proposal in PROPOSALS[:max_experiments]:
                    self._execute_proposal(session_id, config, objective, hypothesis, proposal)
                    time.sleep(0.25)

            session = self.repos.sessions.update_status(session_id, "closed")
            event = self.record_event(
                "session.completed",
                f"Completed {session_id}",
                session_id=session_id,
            )
            if session is not None:
                self.emit_collection_upsert("sessions", session_id, session.model_dump(), cursor=event.id)
        except Exception as error:
            session = self.repos.sessions.update_status(session_id, "closed")
            event = self.record_event(
                "session.failed",
                f"Session failed: {error}",
                session_id=session_id,
                payload={"error": str(error)},
            )
            if session is not None:
                self.emit_collection_upsert("sessions", session_id, session.model_dump(), cursor=event.id)

    def _ensure_seed_hypothesis(
        self,
        session_id: str,
        objective: ObjectiveRecord,
    ) -> HypothesisRecord:
        hypothesis_id = f"hyp_{objective.id}_toy_components"
        existing = self.repos.hypotheses.get(hypothesis_id)
        if existing is not None:
            if existing.status != "active":
                updated = self.repos.hypotheses.update(hypothesis_id, status="active")
                if updated is not None:
                    existing = updated
            return existing

        hypothesis = self.repos.hypotheses.create(
            hypothesis_id=hypothesis_id,
            objective_id=objective.id,
            title="Toy components can improve the score",
            summary="Compare baseline, individual components, and simple combinations.",
            status="active",
            associated_session_id=session_id,
        )
        event = self.record_event(
            "hypothesis.created",
            f"Created hypothesis {hypothesis.id}",
            session_id=session_id,
            payload={"hypothesis_id": hypothesis.id},
        )
        self.emit_collection_upsert("hypotheses", hypothesis.id, hypothesis.model_dump(), cursor=event.id)
        self._record_hypothesis_activity(
            session_id=session_id,
            hypothesis_id=hypothesis.id,
            actor="harness",
            kind="comment",
            body="Seeded the first hypothesis for the deterministic toy loop.",
            payload={"objective_id": objective.id},
        )
        return hypothesis

    def _record_agent_plan(
        self,
        session_id: str,
        config: ProjectConfigRecord,
        objective: ObjectiveRecord,
        hypothesis: HypothesisRecord,
    ) -> None:
        try:
            plan = self.agent_runtime.plan_session(
                config=config.model_dump(),
                objective=objective.model_dump(),
                current_state=self.current_state_api.get().model_dump(),
                session_id=session_id,
                repos=self.repos,
            )
        except Exception as error:
            self._record_hypothesis_activity(
                session_id=session_id,
                hypothesis_id=hypothesis.id,
                actor="harness",
                kind="comment",
                body=f"Agent runtime failed: {error}",
                payload={"activity_type": "concern", "error": str(error)},
            )
            return

        self._record_hypothesis_activity(
            session_id=session_id,
            hypothesis_id=hypothesis.id,
            actor="agent",
            kind="comment",
            body=plan.summary,
            payload={"activity_type": "plan", **plan.model_dump()},
        )

    def _execute_proposal(
        self,
        session_id: str,
        config: ProjectConfigRecord,
        objective: ObjectiveRecord,
        hypothesis: HypothesisRecord,
        proposal: Proposal,
    ) -> None:
        with span("almanac.experiment.execute", session_id=session_id, proposal=proposal.suffix):
            experiment_id = f"exp_{session_id}_{proposal.suffix}"
            based_on = [f"exp_{session_id}_{suffix}" for suffix in proposal.based_on_suffixes]
            experiment = self.repos.experiments.create(
                experiment_id=experiment_id,
                objective_id=objective.id,
                title=proposal.title,
                summary=proposal.summary,
                associated_session_id=session_id,
                status="open",
            )
            event = self.record_event(
                "experiment.created",
                f"Created {experiment_id}",
                session_id=session_id,
                payload={"experiment_id": experiment_id, "components": proposal.components},
            )
            self.emit_collection_upsert("experiments", experiment_id, experiment.model_dump(), cursor=event.id)

            link = self.repos.hypothesis_experiment_links.create(
                hypothesis_id=hypothesis.id,
                experiment_id=experiment_id,
            )
            event = self.record_event(
                "hypothesis.experiment_linked",
                f"Linked {experiment_id} to {hypothesis.id}",
                session_id=session_id,
                payload=link.model_dump(),
            )
            self.emit_collection_upsert(
                "hypothesis_experiment_links",
                f"{link.hypothesis_id}:{link.experiment_id}",
                link.model_dump(),
                cursor=event.id,
            )

            self._record_experiment_activity(
                session_id=session_id,
                experiment_id=experiment_id,
                actor="harness",
                kind="comment",
                body=proposal.summary,
                payload={"components": proposal.components, "based_on": based_on},
            )

            experiment = self.repos.experiments.update(experiment_id, status="active")
            event = self.record_event(
                "experiment.started",
                f"Started {experiment_id}",
                session_id=session_id,
                payload={"experiment_id": experiment_id},
            )
            if experiment is not None:
                self.emit_collection_upsert("experiments", experiment_id, experiment.model_dump(), cursor=event.id)

            result = self.workers.run_experiment(
                ExperimentRunParams(
                    session_id=session_id,
                    objective_id=objective.id,
                    experiment_id=experiment_id,
                    title=proposal.title,
                    summary=proposal.summary,
                    components=proposal.components,
                    based_on=based_on,
                ),
                on_progress=lambda notification: self._record_worker_progress(session_id, notification),
            )

            signals = result.signals
            self._record_experiment_activity(
                session_id=session_id,
                experiment_id=experiment_id,
                actor="worker",
                kind="comment",
                body=result.summary,
                payload={
                    "activity_type": "result",
                    "status": result.status,
                    "signals": signals,
                    "raw": result.raw,
                },
            )

            concerns = check_result(
                known_signals=self._expected_signals(config.research_context),
                baseline_score=self._baseline_score(session_id),
                signals=signals,
                raw=result.raw,
            )
            for kind, message in concerns:
                self._record_experiment_activity(
                    session_id=session_id,
                    experiment_id=experiment_id,
                    actor="harness",
                    kind="comment",
                    body=f"{experiment_id}: {message}",
                    payload={"activity_type": "concern", "concern_kind": kind},
                )

            self._record_hypothesis_activity(
                session_id=session_id,
                hypothesis_id=hypothesis.id,
                actor="harness",
                kind="comment",
                body=self._interpret_result(experiment_id, result.summary, concerns),
                payload={
                    "activity_type": "interpretation",
                    "experiment_id": experiment_id,
                    "concern_count": len(concerns),
                },
            )

            experiment = self.repos.experiments.update(experiment_id, status="closed")
            event = self.record_event(
                "experiment.completed",
                f"Completed {experiment_id}",
                session_id=session_id,
                payload={"experiment_id": experiment_id, "concern_count": len(concerns)},
            )
            if experiment is not None:
                self.emit_collection_upsert("experiments", experiment_id, experiment.model_dump(), cursor=event.id)

    def _record_worker_progress(self, session_id: str, notification: dict[str, Any]) -> None:
        params = notification.get("params") or {}
        self.record_event(
            "worker.progress",
            str(params.get("message", "worker progress")),
            session_id=session_id,
            payload=params,
        )

    def _record_hypothesis_activity(
        self,
        *,
        session_id: str,
        hypothesis_id: str,
        actor: str,
        kind: str,
        body: str,
        payload: dict[str, Any] | None = None,
    ) -> None:
        activity = self.repos.hypothesis_activities.add(
            hypothesis_id=hypothesis_id,
            session_id=session_id,
            actor=actor,
            kind=kind,
            body=body,
            payload=payload,
        )
        event = self.record_event(
            "hypothesis.activity_recorded",
            body,
            session_id=session_id,
            payload={"activity_id": activity.id, "hypothesis_id": hypothesis_id, "kind": kind},
        )
        self.emit_collection_upsert(
            "hypothesis_activities",
            str(activity.id),
            activity.model_dump(),
            cursor=event.id,
        )

    def _record_experiment_activity(
        self,
        *,
        session_id: str,
        experiment_id: str,
        actor: str,
        kind: str,
        body: str,
        payload: dict[str, Any] | None = None,
    ) -> None:
        activity = self.repos.experiment_activities.add(
            experiment_id=experiment_id,
            session_id=session_id,
            actor=actor,
            kind=kind,
            body=body,
            payload=payload,
        )
        event = self.record_event(
            "experiment.activity_recorded",
            body,
            session_id=session_id,
            payload={"activity_id": activity.id, "experiment_id": experiment_id, "kind": kind},
        )
        self.emit_collection_upsert(
            "experiment_activities",
            str(activity.id),
            activity.model_dump(),
            cursor=event.id,
        )

    def _baseline_score(self, session_id: str) -> float | None:
        baseline_id = f"exp_{session_id}_baseline"
        activities = self.repos.experiment_activities.list_for_experiment(baseline_id)
        for activity in reversed(activities):
            if (
                activity.payload.get("activity_type") != "result"
                and "signals" not in activity.payload
            ):
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

    @staticmethod
    def _expected_signals(research_context: str) -> list[str]:
        match = re.search(
            r"(?:expected|known)\s+signals?\s*:\s*([^\n.]+)",
            research_context,
            flags=re.IGNORECASE,
        )
        if match is None:
            return []
        signals = re.split(r",|\band\b", match.group(1), flags=re.IGNORECASE)
        return [signal.strip(" `.;") for signal in signals if signal.strip(" `.;")]

    @staticmethod
    def _interpret_result(
        experiment_id: str,
        summary: str,
        concerns: list[tuple[str, str]],
    ) -> str:
        if concerns:
            return f"{experiment_id} produced concerns; keep the result visible but do not trust it blindly."
        return f"{experiment_id} completed: {summary}"


class MethodNotFound(Exception):
    def __init__(self, method: str) -> None:
        super().__init__(method)
        self.method = method
