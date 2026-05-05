from __future__ import annotations

import threading
from pathlib import Path
from typing import Any, Callable

from almanac.protocol import (
    CollectionsBootstrapParams,
    CollectionsBootstrapResult,
    CollectionsSubscribeParams,
    CollectionsSubscribeResult,
    EventsSubscribeParams,
    EventsSubscribeResult,
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
from .api.collections import CollectionsService, publish_record_upsert
from .api.current_state import CurrentStateService
from .api.sessions import SessionsService
from .core.db import Database
from .core.notifications import (
    register_project_notifications,
    set_project_collections_subscribed,
    set_project_events_subscribed,
)
from .observability import span
from .project_context import ProjectContext
from .records import EventRecord
from .records.base import DbRecord
from .repositories import Repositories

NotificationWriter = Callable[[str, dict[str, Any]], None]


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
        self.app_root = app_root
        self.agent_runtime = AgentRuntime(self.context.project_dir)
        self.notify = notify
        register_project_notifications(self.context.project_id, notify)
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
        event = self.record_event(
            "setup.completed",
            "Configured project context",
            payload={
                "objective_id": objective.id,
                "objective": objective.title,
                "research_context": config.research_context,
            },
        )
        self.publish_record(objective, cursor=event.id)
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
        set_project_collections_subscribed(self.context.project_id, True)
        return CollectionsSubscribeResult(
            subscribed=True,
            cursor=self.collections_api.current_cursor(),
        ).model_dump()

    def events_subscribe(self, params: dict[str, Any]) -> dict[str, Any]:
        subscribe = EventsSubscribeParams.model_validate(params)
        self.subscribed = True
        set_project_events_subscribed(self.context.project_id, True)
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
        self.publish_record(session, cursor=event.id)

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
        self.publish_record(event, cursor=event.id)
        return event

    def publish_record(
        self,
        record: DbRecord,
        *,
        cursor: int,
    ) -> None:
        publish_record_upsert(
            project_id=self.context.project_id,
            record=record,
            cursor=cursor,
        )

    def _execute_session(self, session_id: str, max_experiments: int) -> None:
        try:
            config = self.repos.project_config.get()
            objective = self.repos.objectives.get_active()
            if config is None or objective is None:
                raise RuntimeError("missing project setup")

            with span("almanac.session.execute", session_id=session_id, workspace=config.repo_path):
                result = self.agent_runtime.run_session(
                    config=config.model_dump(),
                    objective=objective.model_dump(),
                    current_state=self.current_state_api.get().model_dump(),
                    session_id=session_id,
                    max_experiments=max_experiments,
                    app_root=self.app_root,
                    repos=self.repos,
                )

            self.record_event(
                "session.agent_completed",
                result.summary,
                session_id=session_id,
                payload=result.model_dump(),
            )
            session = self.repos.sessions.update_status(session_id, "closed")
            event = self.record_event(
                "session.completed",
                f"Completed {session_id}",
                session_id=session_id,
            )
            if session is not None:
                self.publish_record(session, cursor=event.id)
        except Exception as error:
            session = self.repos.sessions.update_status(session_id, "closed")
            event = self.record_event(
                "session.failed",
                f"Session failed: {error}",
                session_id=session_id,
                payload={"error": str(error)},
            )
            if session is not None:
                self.publish_record(session, cursor=event.id)


class MethodNotFound(Exception):
    def __init__(self, method: str) -> None:
        super().__init__(method)
        self.method = method
