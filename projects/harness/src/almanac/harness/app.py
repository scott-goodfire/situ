from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from almanac.protocol import (
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
    StateSnapshotParams,
)

from .findings import update_findings
from .project_context import ProjectContext
from .state import StateStore
from .trust_checks import check_evidence
from .worker_manager import WorkerManager

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
    def __init__(self, repo_root: Path, notify: NotificationWriter) -> None:
        self.context = ProjectContext(repo_root)
        self.store = StateStore(
            self.context.project_dir / "almanac.sqlite",
            project_id=self.context.project_id,
            repo_path=str(self.context.repo_root),
        )
        self.workers = WorkerManager(self.context.repo_root)
        self.notify = notify
        self.subscribed = False
        self._run_counter = len(self.store.snapshot()["runs"])

    def handle(self, method: str, params: dict[str, Any] | None) -> dict[str, Any]:
        handlers = {
            "harness.hello": self.hello,
            "setup.get": self.setup_get,
            "setup.complete": self.setup_complete,
            "state.snapshot": self.state_snapshot,
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
        config = self.store.get_config()
        return SetupGetResult(configured=config is not None, config=config).model_dump()

    def setup_complete(self, params: dict[str, Any]) -> dict[str, Any]:
        setup = SetupCompleteParams.model_validate(params)
        config = self.store.set_config(
            goal=setup.goal,
            evaluation_context=setup.evaluation_context,
            known_signals=setup.known_signals,
            experiment_scope=setup.experiment_scope,
        )
        self.record_event(
            "setup.completed",
            "Configured project context",
            payload={"goal": config["goal"], "known_signals": config["known_signals"]},
        )
        return SetupCompleteResult(config=config).model_dump()

    def state_snapshot(self, params: dict[str, Any]) -> dict[str, Any]:
        StateSnapshotParams.model_validate(params)
        return self.store.snapshot()

    def events_subscribe(self, params: dict[str, Any]) -> dict[str, Any]:
        subscribe = EventsSubscribeParams.model_validate(params)
        self.subscribed = True
        replayed = 0
        if subscribe.replay_existing:
            for event in self.store.snapshot()["events"]:
                self.notify("event.appended", {"event": event})
                replayed += 1
        return EventsSubscribeResult(subscribed=True, replayed=replayed).model_dump()

    def run_start(self, params: dict[str, Any]) -> dict[str, Any]:
        start = RunStartParams.model_validate(params)
        if self.store.get_config() is None:
            raise RuntimeError("setup must be completed before starting a run")

        self._run_counter += 1
        run_id = f"run_{self._run_counter:04d}"
        self.store.create_run(run_id)
        self.record_event("run.started", f"Started {run_id}", run_id=run_id)

        thread = threading.Thread(
            target=self._execute_run,
            args=(run_id, start.max_experiments),
            daemon=True,
        )
        thread.start()

        return RunStartResult(run_id=run_id, status="running").model_dump()

    def run_status(self, params: dict[str, Any]) -> dict[str, Any]:
        status = RunStatusParams.model_validate(params)
        return RunStatusResult(run=self.store.get_run(status.run_id)).model_dump()

    def record_event(
        self,
        event_type: str,
        message: str,
        *,
        run_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        event = self.store.add_event(
            event_type=event_type,
            message=message,
            run_id=run_id,
            payload=payload,
        )
        if self.subscribed:
            self.notify("event.appended", {"event": event})
        return event

    def _execute_run(self, run_id: str, max_experiments: int) -> None:
        try:
            config = self.store.get_config()
            if config is None:
                raise RuntimeError("missing project config")

            for proposal in PROPOSALS[: max_experiments + 1]:
                experiment_id = f"exp_{run_id}_{proposal.suffix}"
                based_on = [f"exp_{run_id}_{suffix}" for suffix in proposal.based_on_suffixes]
                self.store.create_experiment(
                    experiment_id=experiment_id,
                    run_id=run_id,
                    intent=proposal.intent,
                    change_summary=proposal.change_summary,
                    components=proposal.components,
                    based_on=based_on,
                )
                self.record_event(
                    "experiment.queued",
                    f"Queued {experiment_id}",
                    run_id=run_id,
                    payload={"experiment_id": experiment_id, "components": proposal.components},
                )

                self.store.update_experiment(experiment_id, status="running")
                self.record_event(
                    "experiment.started",
                    f"Started {experiment_id}",
                    run_id=run_id,
                    payload={"experiment_id": experiment_id},
                )

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
                evidence = self.store.add_evidence(
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
                    known_signals=config["known_signals"],
                    baseline_score=self._baseline_score(run_id),
                    signals=signals,
                    raw=result.raw,
                )
                suspicious_reason = None
                for kind, message in warnings:
                    warning = self.store.add_warning(
                        run_id=run_id,
                        experiment_id=experiment_id,
                        kind=kind,
                        message=f"{experiment_id}: {message}",
                    )
                    suspicious_reason = message if suspicious_reason is None else suspicious_reason
                    self.record_event(
                        "warning.created",
                        warning["message"],
                        run_id=run_id,
                        payload={"warning": warning},
                    )

                suspicious = suspicious_reason is not None
                self.store.update_experiment(
                    experiment_id,
                    status="suspicious" if suspicious else result.status,
                    suspicious=suspicious,
                    suspicious_reason=suspicious_reason,
                    note=evidence["summary"],
                )
                update_findings(self.store, run_id)
                self.record_event(
                    "experiment.completed",
                    f"Completed {experiment_id}",
                    run_id=run_id,
                    payload={"experiment_id": experiment_id, "suspicious": suspicious},
                )
                time.sleep(0.25)

            self.store.update_run_status(run_id, "completed")
            self.record_event("run.completed", f"Completed {run_id}", run_id=run_id)
        except Exception as error:
            self.store.update_run_status(run_id, "failed")
            self.record_event(
                "run.failed",
                f"Run failed: {error}",
                run_id=run_id,
                payload={"error": str(error)},
            )

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
        for evidence in self.store.snapshot()["evidence"]:
            if evidence["experiment_id"] != baseline_id:
                continue
            for signal in evidence["signals"]:
                if signal["key"] == "score" and isinstance(signal["value"], int | float):
                    return float(signal["value"])
        return None


class MethodNotFound(Exception):
    def __init__(self, method: str) -> None:
        super().__init__(method)
        self.method = method
