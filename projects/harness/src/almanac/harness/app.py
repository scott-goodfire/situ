from __future__ import annotations

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
    RunStartParams,
    RunStartResult,
    RunStatusParams,
    RunStatusResult,
    SetupCompleteParams,
    SetupCompleteResult,
    SetupGetParams,
    SetupGetResult,
)

from .agent_runtime import AgentRuntime
from .api.collections import CollectionsService
from .api.current_state import CurrentStateService
from .api.runs import RunsService
from .core.db import Database
from .core.trust import check_evidence
from .core.workers import WorkerManager
from .findings import update_findings
from .observability import span
from .project_context import ProjectContext
from .records import EventRecord, ProjectConfigRecord
from .repositories import Repositories

NotificationWriter = Callable[[str, dict[str, Any]], None]


@dataclass(frozen=True)
class Proposal:
    suffix: str
    intent: str
    change_summary: str
    components: list[str]
    based_on_suffixes: list[str]


PROPOSALS = [
    Proposal(
        suffix="baseline",
        intent="Record baseline evidence.",
        change_summary="Baseline toy evaluation.",
        components=["baseline"],
        based_on_suffixes=[],
    ),
    Proposal(
        suffix="a",
        intent="Try component A on its own.",
        change_summary="Apply toy component A.",
        components=["A"],
        based_on_suffixes=["baseline"],
    ),
    Proposal(
        suffix="b",
        intent="Try component B on its own.",
        change_summary="Apply toy component B.",
        components=["B"],
        based_on_suffixes=["baseline"],
    ),
    Proposal(
        suffix="c",
        intent="Try component C on its own.",
        change_summary="Apply toy component C.",
        components=["C"],
        based_on_suffixes=["baseline"],
    ),
    Proposal(
        suffix="a_c",
        intent="Combine promising components A and C.",
        change_summary="Apply toy components A + C.",
        components=["A", "C"],
        based_on_suffixes=["a", "c"],
    ),
    Proposal(
        suffix="bad",
        intent="Demonstrate suspicious evidence handling.",
        change_summary="Return a suspicious toy result.",
        components=["bad"],
        based_on_suffixes=["baseline"],
    ),
]


class HarnessApp:
    def __init__(self, workspace_root: Path, notify: NotificationWriter, app_root: Path | None = None) -> None:
        self.context = ProjectContext(workspace_root)
        self.db = Database(
            self.context.project_dir / "almanac.sqlite",
            project_id=self.context.project_id,
            repo_path=str(self.context.repo_root),
        )
        self.repos = Repositories.create(self.db)
        self.collections_api = CollectionsService(repos=self.repos)
        self.current_state_api = CurrentStateService(repos=self.repos)
        self.runs_api = RunsService(repos=self.repos)
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
            "run.start": self.run_start,
            "run.status": self.run_status,
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
        return SetupGetResult(
            configured=config is not None,
            config=config.model_dump() if config is not None else None,
        ).model_dump()

    def setup_complete(self, params: dict[str, Any]) -> dict[str, Any]:
        setup = SetupCompleteParams.model_validate(params)
        config = self.repos.project_config.set(
            goal=setup.goal,
            evaluation_context=setup.evaluation_context,
            known_signals=setup.known_signals,
            experiment_scope=setup.experiment_scope,
        )
        self.record_event(
            "setup.completed",
            "Configured project context",
            payload={"goal": config.goal, "known_signals": config.known_signals},
        )
        return SetupCompleteResult(config=config.model_dump()).model_dump()

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

    def run_start(self, params: dict[str, Any]) -> dict[str, Any]:
        start = RunStartParams.model_validate(params)
        if self.repos.project_config.get() is None:
            raise RuntimeError("setup must be completed before starting a run")

        run_id = self.runs_api.next_run_id().run_id
        run = self.repos.runs.create(run_id)
        event = self.record_event("run.started", f"Started {run_id}", run_id=run_id)
        self.emit_collection_upsert("runs", run_id, run.model_dump(), cursor=event.id)

        thread = threading.Thread(
            target=self._execute_run,
            args=(run_id, start.max_experiments),
            daemon=True,
        )
        thread.start()

        return RunStartResult(run_id=run_id, status="running").model_dump()

    def run_status(self, params: dict[str, Any]) -> dict[str, Any]:
        status = RunStatusParams.model_validate(params)
        run = self.repos.runs.get(status.run_id)
        return RunStatusResult(run=run.model_dump() if run is not None else None).model_dump()

    def record_event(
        self,
        event_type: str,
        message: str,
        *,
        run_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> EventRecord:
        event = self.repos.events.add(
            event_type=event_type,
            message=message,
            run_id=run_id,
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

    def _execute_run(self, run_id: str, max_experiments: int) -> None:
        try:
            config = self.repos.project_config.get()
            if config is None:
                raise RuntimeError("missing project config")

            self._record_agent_plan(run_id, config)

            with span("almanac.run.execute", run_id=run_id, workspace=config.repo_path):
                for proposal in PROPOSALS[: max_experiments + 1]:
                    self._execute_proposal(run_id, config, proposal)
                    time.sleep(0.25)

            run = self.repos.runs.update_status(run_id, "completed")
            event = self.record_event("run.completed", f"Completed {run_id}", run_id=run_id)
            if run is not None:
                self.emit_collection_upsert("runs", run_id, run.model_dump(), cursor=event.id)
        except Exception as error:
            run = self.repos.runs.update_status(run_id, "failed")
            event = self.record_event(
                "run.failed",
                f"Run failed: {error}",
                run_id=run_id,
                payload={"error": str(error)},
            )
            if run is not None:
                self.emit_collection_upsert("runs", run_id, run.model_dump(), cursor=event.id)

    def _record_agent_plan(self, run_id: str, config: ProjectConfigRecord) -> None:
        try:
            plan = self.agent_runtime.plan_run(
                config=config.model_dump(),
                current_state=self.current_state_api.get().model_dump(),
                run_id=run_id,
                repos=self.repos,
            )
        except Exception as error:
            warning = self.repos.warnings.add(
                run_id=run_id,
                kind="agent_runtime_failed",
                message=f"Agent runtime failed: {error}",
            )
            self.record_event(
                "warning.created",
                warning.message,
                run_id=run_id,
                payload={"warning": warning.model_dump()},
            )
            return

        self.record_event(
            "agent.plan.created",
            plan.summary,
            run_id=run_id,
            payload=plan.model_dump(),
        )

    def _execute_proposal(self, run_id: str, config: ProjectConfigRecord, proposal: Proposal) -> None:
        with span("almanac.experiment.execute", run_id=run_id, proposal=proposal.suffix):
            experiment_id = f"exp_{run_id}_{proposal.suffix}"
            based_on = [f"exp_{run_id}_{suffix}" for suffix in proposal.based_on_suffixes]
            experiment = self.repos.experiments.create(
                experiment_id=experiment_id,
                run_id=run_id,
                intent=proposal.intent,
                change_summary=proposal.change_summary,
                components=proposal.components,
                based_on=based_on,
            )
            event = self.record_event(
                "experiment.queued",
                f"Queued {experiment_id}",
                run_id=run_id,
                payload={"experiment_id": experiment_id, "components": proposal.components},
            )
            self.emit_collection_upsert("experiments", experiment_id, experiment.model_dump(), cursor=event.id)

            experiment = self.repos.experiments.update(experiment_id, status="running")
            event = self.record_event(
                "experiment.started",
                f"Started {experiment_id}",
                run_id=run_id,
                payload={"experiment_id": experiment_id},
            )
            if experiment is not None:
                self.emit_collection_upsert("experiments", experiment_id, experiment.model_dump(), cursor=event.id)

            result = self.workers.run_experiment(
                ExperimentRunParams(
                    run_id=run_id,
                    experiment_id=experiment_id,
                    intent=proposal.intent,
                    components=proposal.components,
                    based_on=based_on,
                ),
                on_progress=lambda notification: self._record_worker_progress(run_id, notification),
            )

            signals = [signal.model_dump() for signal in result.signals]
            evidence = self.repos.evidence.add(
                run_id=run_id,
                experiment_id=experiment_id,
                summary=result.summary,
                signals=signals,
                raw=result.raw,
            )
            self.record_event(
                "evidence.recorded",
                result.summary,
                run_id=run_id,
                payload={"experiment_id": experiment_id, "signals": signals},
            )

            warnings = check_evidence(
                known_signals=config.known_signals,
                baseline_score=self._baseline_score(run_id),
                signals=signals,
                raw=result.raw,
            )
            suspicious_reason = None
            for kind, message in warnings:
                warning = self.repos.warnings.add(
                    run_id=run_id,
                    experiment_id=experiment_id,
                    kind=kind,
                    message=f"{experiment_id}: {message}",
                )
                suspicious_reason = message if suspicious_reason is None else suspicious_reason
                self.record_event(
                    "warning.created",
                    warning.message,
                    run_id=run_id,
                    payload={"warning": warning.model_dump()},
                )

            suspicious = suspicious_reason is not None
            experiment = self.repos.experiments.update(
                experiment_id,
                status="suspicious" if suspicious else result.status,
                suspicious=suspicious,
                suspicious_reason=suspicious_reason,
                note=evidence.summary,
            )
            update_findings(self.repos, run_id)
            event = self.record_event(
                "experiment.completed",
                f"Completed {experiment_id}",
                run_id=run_id,
                payload={"experiment_id": experiment_id, "suspicious": suspicious},
            )
            if experiment is not None:
                self.emit_collection_upsert("experiments", experiment_id, experiment.model_dump(), cursor=event.id)

    def _record_worker_progress(self, run_id: str, notification: dict[str, Any]) -> None:
        params = notification.get("params") or {}
        self.record_event(
            "worker.progress",
            str(params.get("message", "worker progress")),
            run_id=run_id,
            payload=params,
        )

    def _baseline_score(self, run_id: str) -> float | None:
        baseline_id = f"exp_{run_id}_baseline"
        evidence = self.repos.evidence.get_for_experiment(baseline_id)
        if evidence is None:
            return None
        for signal in evidence.signals:
            if signal.key == "score" and isinstance(signal.value, int | float):
                return float(signal.value)
        return None


class MethodNotFound(Exception):
    def __init__(self, method: str) -> None:
        super().__init__(method)
        self.method = method
