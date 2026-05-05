from __future__ import annotations

import threading
from pathlib import Path
from typing import Any, Callable

from situ.protocol import (
    CollectionsBootstrapParams,
    CollectionsBootstrapResult,
    CollectionsSubscribeParams,
    CollectionsSubscribeResult,
    EventsSubscribeParams,
    EventsSubscribeResult,
    HarnessHelloParams,
    HarnessHelloResult,
    SessionResumeParams,
    SessionResumeResult,
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
from .core.observability import span
from .core.project_context import ProjectContext
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
            self.context.project_dir / "situ.sqlite",
            project_id=self.context.project_id,
            repo_path=str(self.context.repo_root),
        )
        self.repos = Repositories.create(self.db)
        self.collections_api = CollectionsService(repos=self.repos)
        self.current_state_api = CurrentStateService(repos=self.repos)
        self.sessions_api = SessionsService(repos=self.repos)
        self.app_root = app_root
        self._agent_runtime: AgentRuntime | None = None
        self.notify = notify
        register_project_notifications(self.context.project_id, notify)
        self.subscribed = False
        self.collection_subscribed = False
        self._session_setup: dict[str, dict[str, str]] = {}

    def handle(self, method: str, params: dict[str, Any] | None) -> dict[str, Any]:
        handlers = {
            "harness.hello": self.hello,
            "setup.get": self.setup_get,
            "setup.complete": self.setup_complete,
            "collections.bootstrap": self.collections_bootstrap,
            "collections.subscribe": self.collections_subscribe,
            "events.subscribe": self.events_subscribe,
            "session.resume": self.session_resume,
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
        project = self.repos.project.get()
        return SetupGetResult(
            configured=project is not None,
            project=project.model_dump() if project is not None else None,
        ).model_dump()

    def setup_complete(self, params: dict[str, Any]) -> dict[str, Any]:
        SetupCompleteParams.model_validate(params)
        project = self.repos.project.ensure()
        self.record_event(
            "setup.completed",
            "Configured project context",
            payload={"project_id": project.id},
        )
        return SetupCompleteResult(project=project.model_dump()).model_dump()

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
        project = self.repos.project.ensure()

        session_id = self.sessions_api.next_session_id().session_id
        session = self.repos.sessions.create(
            session_id,
            project_id=project.id,
        )
        self._session_setup[session_id] = {
            "objective": start.objective,
            "research_context": start.research_context,
        }
        event = self.record_event(
            "session.started",
            f"Started {session_id}",
            session_id=session_id,
            payload={
                "objective": start.objective,
                "research_context": start.research_context,
            },
        )
        self.publish_record(session, cursor=event.id)

        self._start_session_thread(
            session_id=session_id,
            max_experiments=start.max_experiments,
        )

        return SessionStartResult(session_id=session_id, status="active").model_dump()

    def session_resume(self, params: dict[str, Any]) -> dict[str, Any]:
        resume = SessionResumeParams.model_validate(params)
        session = self.repos.sessions.get(resume.session_id)
        if session is None:
            raise RuntimeError(f"session not found: {resume.session_id}")

        session = self.repos.sessions.update_status(resume.session_id, "active") or session
        event = self.record_event(
            "session.resumed",
            f"Resumed {resume.session_id}",
            session_id=resume.session_id,
        )
        self.publish_record(session, cursor=event.id)

        self._session_setup.setdefault(
            resume.session_id,
            self._setup_from_records(resume.session_id),
        )

        self._start_session_thread(
            session_id=resume.session_id,
            max_experiments=resume.max_experiments,
        )
        return SessionResumeResult(
            session_id=resume.session_id,
            status=session.status.value,
        ).model_dump()

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
            project = self.repos.project.get()
            session = self.repos.sessions.get(session_id)
            if project is None or session is None:
                raise RuntimeError("missing project setup")

            setup = self._session_setup.get(session_id) or self._setup_from_records(
                session_id
            )

            with span("situ.session.execute", session_id=session_id, workspace=project.repo_path):
                result = self._get_agent_runtime().run_session(
                    project=project.model_dump(),
                    setup_objective=setup.get("objective", ""),
                    setup_research_context=setup.get("research_context", ""),
                    current_state=self.sessions_api.get_session(session_id).model_dump(),
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

    def _setup_from_records(self, session_id: str) -> dict[str, str]:
        objective = self.repos.objectives.get_for_session(session_id)
        research_context = self.repos.research_contexts.get_for_session(session_id)
        return {
            "objective": objective.title if objective is not None else "",
            "research_context": research_context.body if research_context is not None else "",
        }

    def _get_agent_runtime(self) -> AgentRuntime:
        if self._agent_runtime is None:
            self._agent_runtime = AgentRuntime(self.context.project_dir)
        return self._agent_runtime

    def _start_session_thread(
        self,
        *,
        session_id: str,
        max_experiments: int,
    ) -> None:
        thread = threading.Thread(
            target=self._execute_session,
            args=(session_id, max_experiments),
            daemon=True,
        )
        thread.start()


class MethodNotFound(Exception):
    def __init__(self, method: str) -> None:
        super().__init__(method)
        self.method = method
