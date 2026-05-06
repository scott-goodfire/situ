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
from .records import AgentKind, AgentStatus, EventRecord, TaskKind, TaskRecord, TaskStatus
from .records.base import DbRecord
from .repositories import Repositories
from .tools.tasks.eligibility import eligible_task_kinds_for_agent

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
            workspace_id=self.context.workspace_id,
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
        workspace = self.repos.workspaces.get()
        return SetupGetResult(
            configured=workspace is not None,
            workspace=workspace.model_dump() if workspace is not None else None,
        ).model_dump()

    def setup_complete(self, params: dict[str, Any]) -> dict[str, Any]:
        SetupCompleteParams.model_validate(params)
        workspace = self.repos.workspaces.ensure()
        event = self.record_event(
            "setup.completed",
            "Configured workspace context",
            payload={"workspace_id": workspace.id},
        )
        self.publish_record(workspace, cursor=event.id)
        return SetupCompleteResult(workspace=workspace.model_dump()).model_dump()

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
        workspace = self.repos.workspaces.ensure()
        project = self._project_from_start(start, workspace_id=workspace.id)

        session_id = self.sessions_api.next_session_id().session_id
        session = self.repos.sessions.create(
            session_id,
            workspace_id=workspace.id,
            project_id=project.id if project is not None else None,
        )
        self._session_setup[session_id] = {
            "objective": project.objective if project is not None else start.objective,
            "research_context": (
                project.research_context if project is not None else start.research_context
            ),
        }
        event = self.record_event(
            "session.started",
            f"Started {session_id}",
            session_id=session_id,
            payload={
                "workspace_id": workspace.id,
                "project_id": project.id if project is not None else None,
                "objective": start.objective,
                "research_context": start.research_context,
            },
        )
        self.publish_record(workspace, cursor=event.id)
        if project is not None:
            self.publish_record(project, cursor=event.id)
        self.publish_record(session, cursor=event.id)
        if project is not None:
            self._ensure_project_agents(session_id=session_id, project_id=project.id)
            self._enqueue_plan_task(
                session_id=session_id,
                project_id=project.id,
                title="Plan the first research pass",
                content=(
                    "Read the session project, objective, research context, current "
                    "ledger state, and task board. File the next focused scientist "
                    "task or tasks."
                ),
                source_kind="system",
            )

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
        if session.project_id is not None:
            self._ensure_project_agents(
                session_id=resume.session_id,
                project_id=session.project_id,
            )
            self._enqueue_plan_task(
                session_id=resume.session_id,
                project_id=session.project_id,
                title="Plan the resumed research pass",
                content=(
                    "Review the resumed session and decide what focused work should "
                    "happen next."
                ),
                source_kind="system",
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
        project_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> EventRecord:
        event = self.repos.events.add(
            event_type=event_type,
            message=message,
            associated_project_id=project_id,
            associated_session_id=session_id,
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

    def _project_from_start(
        self,
        start: SessionStartParams,
        *,
        workspace_id: str,
    ):
        requested_project_id = getattr(start, "project_id", None)
        if requested_project_id:
            project = self.repos.projects.get(requested_project_id)
            if project is None:
                raise RuntimeError(f"project not found: {requested_project_id}")
            return project

        objective = start.objective.strip()
        research_context = start.research_context.strip()
        if not objective and not research_context:
            return None

        title = getattr(start, "project_title", None) or objective or "Untitled project"
        return self.repos.projects.create(
            project_id=self.repos.projects.next_id(workspace_id),
            workspace_id=workspace_id,
            title=title,
            objective=objective,
            research_context=research_context,
        )

    def _ensure_project_agents(self, *, session_id: str, project_id: str) -> None:
        for kind, display_name in (
            (AgentKind.MANAGER, "Manager"),
            (AgentKind.SCIENTIST, "Scientist"),
        ):
            existing = self.repos.agents.get_for_project_kind(project_id, kind)
            agent = self.repos.agents.ensure_project_agent(
                project_id=project_id,
                created_in_session_id=session_id,
                kind=kind,
                display_name=display_name,
            )
            if existing is not None:
                continue
            event = self.record_event(
                "agent.created",
                f"Created {display_name} agent",
                session_id=session_id,
                project_id=project_id,
                payload={"agent_id": agent.id, "kind": agent.kind.value},
            )
            self.publish_record(agent, cursor=event.id)

    def _enqueue_plan_task(
        self,
        *,
        session_id: str,
        project_id: str,
        title: str,
        content: str,
        source_kind: str,
    ) -> None:
        task = self.repos.tasks.create(
            task_id=self.repos.tasks.next_id(project_id),
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            content=content,
            kind=TaskKind.PLAN,
            priority="high",
            source_kind=source_kind,
        )
        event = self.record_event(
            "task.created",
            f"Created task {task.id}",
            session_id=session_id,
            project_id=project_id,
            payload={"task_id": task.id, "kind": task.kind.value},
        )
        self.publish_record(task, cursor=event.id)

    def _claim_next_task(
        self,
        *,
        session_id: str,
        agent_kind: AgentKind,
    ) -> TaskRecord | None:
        session = self.repos.sessions.get(session_id)
        if session is None or session.project_id is None:
            return None
        agent = self.repos.agents.ensure_project_agent(
            project_id=session.project_id,
            created_in_session_id=session_id,
            kind=agent_kind,
            display_name="Manager" if agent_kind is AgentKind.MANAGER else "Scientist",
        )
        task = self.repos.tasks.claim_next(
            project_id=session.project_id,
            agent_id=agent.id,
            eligible_kinds=eligible_task_kinds_for_agent(agent.kind),
            claimed_in_session_id=session_id,
        )
        if task is None:
            return None
        updated_agent = self.repos.agents.update(agent.id, status=AgentStatus.ACTIVE) or agent
        event = self.record_event(
            "task.claimed",
            f"Claimed task {task.id}",
            session_id=session_id,
            project_id=session.project_id,
            payload={"task_id": task.id, "agent_id": agent.id},
        )
        self.publish_record(task, cursor=event.id)
        self.publish_record(updated_agent, cursor=event.id)
        return task

    def _finish_claimed_task(
        self,
        *,
        task: TaskRecord,
        session_id: str,
        status: TaskStatus,
        result_summary: str,
    ) -> None:
        current = self.repos.tasks.get(task.id) or task
        terminal_statuses = {TaskStatus.DONE, TaskStatus.ABANDONED, TaskStatus.FAILED}
        if current.status in terminal_statuses:
            if current.assignee_id is not None:
                self.repos.agents.update(current.assignee_id, status=AgentStatus.IDLE)
            return
        updated_task = self.repos.tasks.update(
            task.id,
            status=status,
            result_summary=current.result_summary or result_summary,
            completed_in_session_id=session_id,
        )
        if updated_task is None:
            return
        updated_agent = (
            self.repos.agents.update(updated_task.assignee_id, status=AgentStatus.IDLE)
            if updated_task.assignee_id is not None
            else None
        )
        event = self.record_event(
            f"task.{updated_task.status.value}",
            f"Finished task {updated_task.id}",
            session_id=session_id,
            project_id=updated_task.project_id,
            payload={
                "task_id": updated_task.id,
                "status": updated_task.status.value,
            },
        )
        self.publish_record(updated_task, cursor=event.id)
        if updated_agent is not None:
            self.publish_record(updated_agent, cursor=event.id)

    def _execute_session(self, session_id: str, max_experiments: int) -> None:
        manager_task: TaskRecord | None = None
        scientist_task: TaskRecord | None = None
        try:
            workspace = self.repos.workspaces.get()
            session = self.repos.sessions.get(session_id)
            if workspace is None or session is None:
                raise RuntimeError("missing workspace setup")

            setup = self._session_setup.get(session_id) or self._setup_from_records(
                session_id
            )
            runtime = self._get_agent_runtime()

            with span(
                "situ.session.execute",
                session_id=session_id,
                workspace=workspace.repo_path,
            ):
                manager_task = self._claim_next_task(
                    session_id=session_id,
                    agent_kind=AgentKind.MANAGER,
                )
                manager_result = runtime.plan_session(
                    workspace=workspace.model_dump(),
                    setup_objective=setup.get("objective", ""),
                    setup_research_context=setup.get("research_context", ""),
                    current_state=self.sessions_api.get_session(session_id).model_dump(),
                    session_id=session_id,
                    repos=self.repos,
                    active_task=(
                        manager_task.model_dump() if manager_task is not None else None
                    ),
                )
                self.record_event(
                    "session.manager_completed",
                    manager_result.summary,
                    session_id=session_id,
                    payload=manager_result.model_dump(),
                )
                if manager_task is not None:
                    self._finish_claimed_task(
                        task=manager_task,
                        session_id=session_id,
                        status=TaskStatus.DONE,
                        result_summary=manager_result.summary,
                    )

                scientist_task = self._claim_next_task(
                    session_id=session_id,
                    agent_kind=AgentKind.SCIENTIST,
                )
                result = runtime.run_session(
                    workspace=workspace.model_dump(),
                    setup_objective=setup.get("objective", ""),
                    setup_research_context=setup.get("research_context", ""),
                    current_state=self.sessions_api.get_session(session_id).model_dump(),
                    session_id=session_id,
                    max_experiments=max_experiments,
                    app_root=self.app_root,
                    repos=self.repos,
                    active_task=(
                        scientist_task.model_dump()
                        if scientist_task is not None
                        else None
                    ),
                )
                if scientist_task is not None:
                    self._finish_claimed_task(
                        task=scientist_task,
                        session_id=session_id,
                        status=TaskStatus.DONE,
                        result_summary=result.summary,
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
            if manager_task is not None:
                self._finish_claimed_task(
                    task=manager_task,
                    session_id=session_id,
                    status=TaskStatus.FAILED,
                    result_summary=str(error),
                )
            if scientist_task is not None:
                self._finish_claimed_task(
                    task=scientist_task,
                    session_id=session_id,
                    status=TaskStatus.FAILED,
                    result_summary=str(error),
                )
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
        session = self.repos.sessions.get(session_id)
        project = (
            self.repos.projects.get(session.project_id)
            if session is not None and session.project_id is not None
            else None
        )
        return {
            "objective": project.objective if project is not None else "",
            "research_context": project.research_context if project is not None else "",
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
