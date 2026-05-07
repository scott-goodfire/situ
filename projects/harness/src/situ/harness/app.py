from __future__ import annotations

import threading
from dataclasses import dataclass
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
    SecretsSetOpenAIKeyParams,
    SecretsSetOpenAIKeyResult,
    SecretsStatusParams,
    SecretsStatusResult,
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
from .api.project_board import ProjectBoardService
from .api.sessions import SessionsService
from .config import LocalSecretStore, SituSecrets
from .core.db import Database
from .core.notifications import (
    register_project_notifications,
    set_project_collections_subscribed,
    set_project_events_subscribed,
)
from .core.observability import span
from .core.project_context import ProjectContext
from .core.worktrees import WorktreeManager, require_clean_if_git_workspace
from .records import (
    AgentKind,
    AgentStatus,
    EventRecord,
    ExperimentRecord,
    ProjectRecord,
    ProjectStatus,
    SessionStatus,
    TaskEntityKind,
    TaskKind,
    TaskRecord,
    TaskStatus,
    WorkStatus,
)
from .records.base import DbRecord
from .repositories import Repositories
from .tools.tasks.eligibility import eligible_task_kinds_for_agent

NotificationWriter = Callable[[str, dict[str, Any]], None]

MANAGER_NO_PROGRESS_LIMIT = 3
SESSION_AGENT_PASS_LIMIT_MINIMUM = 12
SESSION_AGENT_PASS_LIMIT_PER_EXPERIMENT = 8


@dataclass(frozen=True, slots=True)
class PreparedExperimentTask:
    task: TaskRecord
    experiment: ExperimentRecord
    repo_path: str


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
            self.context.database_path,
            workspace_id=self.context.workspace_id,
            repo_path=str(self.context.repo_root),
        )
        self.repos = Repositories.create(self.db)
        self.collections_api = CollectionsService(repos=self.repos)
        self.current_state_api = CurrentStateService(repos=self.repos)
        self.sessions_api = SessionsService(repos=self.repos)
        self.project_board_api = ProjectBoardService(repos=self.repos)
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
            "secrets.status": self.secrets_status,
            "secrets.set_openai_key": self.secrets_set_openai_key,
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

    def secrets_status(self, params: dict[str, Any]) -> dict[str, Any]:
        SecretsStatusParams.model_validate(params)
        source = SituSecrets().openai_key_source(home=self.context.home)
        return SecretsStatusResult(
            openai_key_configured=source != "missing",
            openai_key_source=source,
        ).model_dump()

    def secrets_set_openai_key(self, params: dict[str, Any]) -> dict[str, Any]:
        secret = SecretsSetOpenAIKeyParams.model_validate(params)
        LocalSecretStore(home=self.context.home).set_openai_key(secret.openai_key)
        SituSecrets().apply_sdk_environment(home=self.context.home)
        return SecretsSetOpenAIKeyResult().model_dump()

    def collections_bootstrap(self, params: dict[str, Any]) -> dict[str, Any]:
        CollectionsBootstrapParams.model_validate(params)
        bootstrap = self.collections_api.bootstrap(workspace_id=self.context.workspace_id)
        return CollectionsBootstrapResult.model_validate(bootstrap.model_dump()).model_dump()

    def collections_subscribe(self, params: dict[str, Any]) -> dict[str, Any]:
        CollectionsSubscribeParams.model_validate(params)
        self.collection_subscribed = True
        set_project_collections_subscribed(self.context.project_id, True)
        return CollectionsSubscribeResult(
            subscribed=True,
            cursor=self.collections_api.current_cursor(
                workspace_id=self.context.workspace_id
            ),
        ).model_dump()

    def events_subscribe(self, params: dict[str, Any]) -> dict[str, Any]:
        subscribe = EventsSubscribeParams.model_validate(params)
        self.subscribed = True
        set_project_events_subscribed(self.context.project_id, True)
        replayed = 0
        if subscribe.replay_existing:
            project_ids = {
                project.id
                for project in self.repos.projects.list_for_workspace(
                    self.context.workspace_id
                )
            }
            session_ids = {
                session.id
                for session in self.repos.sessions.list_for_workspace(
                    self.context.workspace_id
                )
            }
            for event in self.repos.events.list_all():
                if (
                    event.associated_project_id not in project_ids
                    and event.associated_session_id not in session_ids
                    and (
                        event.associated_project_id is not None
                        or event.associated_session_id is not None
                    )
                ):
                    continue
                self.notify("event.appended", {"event": event.model_dump()})
                replayed += 1
        return EventsSubscribeResult(subscribed=True, replayed=replayed).model_dump()

    def session_start(self, params: dict[str, Any]) -> dict[str, Any]:
        start = SessionStartParams.model_validate(params)
        require_clean_if_git_workspace(
            self.context.repo_root,
            action="starting a Situ session",
        )
        workspace = self.repos.workspaces.ensure()
        session_id = self.sessions_api.next_session_id().session_id
        project = self._project_from_start(start, workspace_id=workspace.id)

        session = self.repos.sessions.create(
            session_id,
            workspace_id=workspace.id,
            project_id=project.id,
        )
        self._session_setup[session_id] = {
            "objective": project.objective,
            "research_context": project.research_context,
        }
        event = self.record_event(
            "session.started",
            f"Started {session_id}",
            session_id=session_id,
            project_id=project.id,
            payload={
                "workspace_id": workspace.id,
                "project_id": project.id,
                "objective": project.objective,
                "research_context": project.research_context,
            },
        )
        self.publish_record(workspace, cursor=event.id)
        self.publish_record(project, cursor=event.id)
        self.publish_record(session, cursor=event.id)
        self._ensure_project_agents(session_id=session_id, project_id=project.id)
        self._enqueue_plan_task(
            session_id=session_id,
            project_id=project.id,
            title="Plan the first research pass",
            content=(
                "Read the session project, objective, research context, current "
                "ledger state, and task board. File the next focused Researcher "
                "or Scientist task or tasks."
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
    ) -> ProjectRecord:
        requested_project_id = getattr(start, "project_id", None)
        if requested_project_id:
            project = self.repos.projects.get(requested_project_id)
            if project is None:
                raise RuntimeError(f"project not found: {requested_project_id}")
            if project.workspace_id != workspace_id:
                raise RuntimeError(
                    f"project {requested_project_id} does not belong to "
                    f"workspace {workspace_id}"
                )
            return project

        objective = start.objective.strip()
        research_context = start.research_context.strip()
        raw_title = getattr(start, "project_title", None)
        title = (
            raw_title.strip()
            if isinstance(raw_title, str) and raw_title.strip()
            else self.context.repo_root.name
            or objective
            or "Untitled project"
        )
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
            (AgentKind.RESEARCHER, "Researcher"),
            (AgentKind.SCIENTIST, "Scientist"),
            (AgentKind.CRITIC, "Critic"),
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

    def _enqueue_experiment_review_task(
        self,
        *,
        session_id: str,
        project_id: str,
        experiment_id: str,
        source_task_id: str,
    ) -> TaskRecord:
        experiment = self.repos.experiments.get(experiment_id)
        evaluations = self.repos.evaluations.list_for_experiment(experiment_id)
        title = (
            f"Review {experiment.title}"
            if experiment is not None and experiment.title
            else f"Review {experiment_id}"
        )
        task = self.repos.tasks.create(
            task_id=self.repos.tasks.next_id(project_id),
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            content=(
                "Review the completed experiment as a proposed change before "
                "the Manager replans from its result. Check the experiment "
                "workspace state, evaluations, measurements, artifacts, and "
                "activities for seed hacking, selection on noise, adaptive "
                "overfitting, greedy hill-climbing risks, and comparability "
                "breaks. Record one experiment review with "
                "`add_experiment_review`, link the central evidence, and mark "
                "this review task done."
            ),
            kind=TaskKind.REVIEW,
            priority="high",
            source_kind="system",
            payload={
                "experiment_id": experiment_id,
                "source_task_id": source_task_id,
                "evaluation_ids": [evaluation.id for evaluation in evaluations],
            },
        )
        links = [
            self.repos.task_entity_links.create(
                project_id=project_id,
                task_id=task.id,
                entity_kind=TaskEntityKind.EXPERIMENT,
                entity_id=experiment_id,
                relationship="reviews",
            )
        ]
        for evaluation in evaluations:
            links.append(
                self.repos.task_entity_links.create(
                    project_id=project_id,
                    task_id=task.id,
                    entity_kind=TaskEntityKind.EVALUATION,
                    entity_id=evaluation.id,
                    relationship="reviews",
                )
            )
        event = self.record_event(
            "task.created",
            f"Created review task {task.id}",
            session_id=session_id,
            project_id=project_id,
            payload={
                "task_id": task.id,
                "kind": task.kind.value,
                "experiment_id": experiment_id,
            },
        )
        self.publish_record(task, cursor=event.id)
        for link in links:
            self.publish_record(link, cursor=event.id)
        return task

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
            display_name=_agent_display_name(agent_kind),
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
                updated_agent = self.repos.agents.update(
                    current.assignee_id,
                    status=AgentStatus.IDLE,
                )
                if updated_agent is not None:
                    self.publish_record(
                        updated_agent,
                        cursor=self.collections_api.current_cursor(
                            workspace_id=self.context.workspace_id
                        ),
                    )
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
        active_task: TaskRecord | None = None
        try:
            workspace = self.repos.workspaces.get()
            session = self.repos.sessions.get(session_id)
            if workspace is None or session is None:
                raise RuntimeError("missing workspace setup")

            setup = self._session_setup.get(session_id) or self._setup_from_records(
                session_id
            )
            runtime = self._get_agent_runtime()
            no_progress_plans = 0
            agent_passes = 0
            max_agent_passes = max(
                SESSION_AGENT_PASS_LIMIT_MINIMUM,
                max_experiments * SESSION_AGENT_PASS_LIMIT_PER_EXPERIMENT,
            )
            completion_summary = "Session loop completed."

            with span(
                "situ.session.execute",
                session_id=session_id,
                workspace=workspace.repo_path,
            ):
                while True:
                    session = self.repos.sessions.get(session_id)
                    if session is None or session.status == SessionStatus.CLOSED:
                        return
                    if (
                        session.project_id is not None
                        and self._project_is_closed(session.project_id)
                    ):
                        completion_summary = "Project is closed."
                        break

                    if agent_passes >= max_agent_passes:
                        completion_summary = (
                            "Stopped after reaching the session agent-pass "
                            f"guardrail ({max_agent_passes} passes)."
                        )
                        break

                    critic_task = self._claim_next_task(
                        session_id=session_id,
                        agent_kind=AgentKind.CRITIC,
                    )
                    if critic_task is not None:
                        active_task = critic_task
                        no_progress_plans = 0
                        agent_passes += 1
                        result = runtime.run_review(
                            workspace=workspace.model_dump(),
                            setup_objective=setup.get("objective", ""),
                            setup_research_context=setup.get("research_context", ""),
                            current_state=self.project_board_api.get_project_board(
                                session_id
                            ).model_dump(),
                            session_id=session_id,
                            app_root=self.app_root,
                            repos=self.repos,
                            active_task=critic_task.model_dump(),
                        )
                        completion_summary = result.summary
                        self._finish_claimed_task(
                            task=critic_task,
                            session_id=session_id,
                            status=TaskStatus.DONE,
                            result_summary=result.summary,
                        )
                        self.record_event(
                            "session.critic_completed",
                            result.summary,
                            session_id=session_id,
                            project_id=critic_task.project_id,
                            payload=result.model_dump(),
                        )
                        active_task = None

                        if self._experiment_count(session_id) < max_experiments:
                            self._enqueue_plan_task(
                                session_id=session_id,
                                project_id=critic_task.project_id,
                                title="Plan after Critic review",
                                content=(
                                    "A Critic review just completed. Review the "
                                    "experiment review activity, concerns, project "
                                    "ledger, task board, and experiment budget. "
                                    "File the next focused Researcher or Scientist "
                                    "task so the research loop keeps moving."
                                ),
                                source_kind="system",
                            )
                        continue

                    completed_experiments = self._experiment_count(session_id)
                    remaining_experiments = max(
                        0,
                        max_experiments - completed_experiments,
                    )
                    if remaining_experiments <= 0:
                        completion_summary = (
                            f"Completed {max_experiments} experiment budget."
                        )
                        break

                    manager_task = self._claim_next_task(
                        session_id=session_id,
                        agent_kind=AgentKind.MANAGER,
                    )
                    if manager_task is not None:
                        active_task = manager_task
                        agent_passes += 1
                        manager_result = runtime.plan_session(
                            workspace=workspace.model_dump(),
                            setup_objective=setup.get("objective", ""),
                            setup_research_context=setup.get("research_context", ""),
                            current_state=self.project_board_api.get_project_board(
                                session_id
                            ).model_dump(),
                            session_id=session_id,
                            repos=self.repos,
                            active_task=manager_task.model_dump(),
                        )
                        completion_summary = manager_result.summary
                        self.record_event(
                            "session.manager_completed",
                            manager_result.summary,
                            session_id=session_id,
                            project_id=manager_task.project_id,
                            payload=manager_result.model_dump(),
                        )
                        self._finish_claimed_task(
                            task=manager_task,
                            session_id=session_id,
                            status=TaskStatus.DONE,
                            result_summary=manager_result.summary,
                        )
                        active_task = None
                        if self._project_is_closed(manager_task.project_id):
                            completion_summary = (
                                "Project was closed by Manager confirmation."
                            )
                            break

                    researcher_task = self._claim_next_task(
                        session_id=session_id,
                        agent_kind=AgentKind.RESEARCHER,
                    )
                    if researcher_task is not None:
                        active_task = researcher_task
                        no_progress_plans = 0
                        agent_passes += 1
                        result = runtime.run_research(
                            workspace=workspace.model_dump(),
                            setup_objective=setup.get("objective", ""),
                            setup_research_context=setup.get("research_context", ""),
                            current_state=self.project_board_api.get_project_board(
                                session_id
                            ).model_dump(),
                            session_id=session_id,
                            app_root=self.app_root,
                            repos=self.repos,
                            active_task=researcher_task.model_dump(),
                        )
                        completion_summary = result.summary
                        self._finish_claimed_task(
                            task=researcher_task,
                            session_id=session_id,
                            status=TaskStatus.DONE,
                            result_summary=result.summary,
                        )
                        self.record_event(
                            "session.researcher_completed",
                            result.summary,
                            session_id=session_id,
                            project_id=researcher_task.project_id,
                            payload=result.model_dump(),
                        )
                        active_task = None
                        self._enqueue_plan_task(
                            session_id=session_id,
                            project_id=researcher_task.project_id,
                            title="Plan after Researcher task completion",
                            content=(
                                "A Researcher task just completed. Review the "
                                "project ledger, task board, recent activity, "
                                "analyses, and hypotheses. File the next focused "
                                "Researcher or Scientist task so the research loop "
                                "keeps moving."
                            ),
                            source_kind="system",
                        )
                        continue

                    scientist_task = self._claim_next_task(
                        session_id=session_id,
                        agent_kind=AgentKind.SCIENTIST,
                    )
                    if scientist_task is not None:
                        active_task = scientist_task
                        no_progress_plans = 0
                        agent_passes += 1
                        prepared_experiment: PreparedExperimentTask | None = None
                        execution_repo_path = workspace.repo_path
                        active_experiment_id: str | None = None
                        if scientist_task.kind == TaskKind.EXPERIMENT:
                            prepared_experiment = self._prepare_experiment_task(
                                task=scientist_task,
                                session_id=session_id,
                                workspace_repo_path=workspace.repo_path,
                            )
                            scientist_task = prepared_experiment.task
                            active_task = scientist_task
                            execution_repo_path = prepared_experiment.repo_path
                            active_experiment_id = prepared_experiment.experiment.id

                        try:
                            result = runtime.run_session(
                                workspace=workspace.model_dump(),
                                setup_objective=setup.get("objective", ""),
                                setup_research_context=setup.get("research_context", ""),
                                current_state=self.project_board_api.get_project_board(
                                    session_id
                                ).model_dump(),
                                session_id=session_id,
                                max_experiments=remaining_experiments,
                                app_root=self.app_root,
                                repos=self.repos,
                                active_task=scientist_task.model_dump(),
                                repo_path=execution_repo_path,
                                active_experiment_id=active_experiment_id,
                            )
                        finally:
                            if prepared_experiment is not None:
                                self._complete_experiment_task(
                                    experiment_id=prepared_experiment.experiment.id,
                                    session_id=session_id,
                                    workspace_repo_path=workspace.repo_path,
                                )
                        completion_summary = result.summary
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
                            project_id=scientist_task.project_id,
                            payload=result.model_dump(),
                        )
                        active_task = None

                        if scientist_task.kind == TaskKind.EXPERIMENT:
                            assert active_experiment_id is not None
                            self._enqueue_experiment_review_task(
                                session_id=session_id,
                                project_id=scientist_task.project_id,
                                experiment_id=active_experiment_id,
                                source_task_id=scientist_task.id,
                            )
                        else:
                            self._enqueue_plan_task(
                                session_id=session_id,
                                project_id=scientist_task.project_id,
                                title="Plan after Scientist task completion",
                                content=(
                                    "A Scientist task just completed. Review the "
                                    "project ledger, task board, recent activity, "
                                    "and experiment budget. File the next focused "
                                    "Researcher or Scientist task so the research "
                                    "loop keeps moving."
                                ),
                                source_kind="system",
                            )
                        continue

                    no_progress_plans += 1
                    if no_progress_plans >= MANAGER_NO_PROGRESS_LIMIT:
                        completion_summary = (
                            "Stopped after "
                            f"{MANAGER_NO_PROGRESS_LIMIT} consecutive planning "
                            "cycles produced no runnable Researcher, Scientist, "
                            "or Critic task."
                        )
                        break

                    project_id = session.project_id
                    if project_id is None:
                        completion_summary = "Stopped because the current run has no project."
                        break
                    self._enqueue_plan_task(
                        session_id=session_id,
                        project_id=project_id,
                        title="Continue planning the next research step",
                        content=(
                            "The previous planning cycle did not leave a "
                            "runnable Researcher, Scientist, or Critic task. Re-read the project "
                            "objective, ledger, and task board, then file one "
                            "focused runnable Researcher or Scientist task unless "
                            "there is a hard blocker."
                        ),
                        source_kind="system",
                    )

            self._close_session(
                session_id=session_id,
                event_type="session.completed",
                message=f"Completed {session_id}: {completion_summary}",
                payload={"summary": completion_summary},
            )
        except Exception as error:
            if active_task is not None:
                self._finish_claimed_task(
                    task=active_task,
                    session_id=session_id,
                    status=TaskStatus.FAILED,
                    result_summary=str(error),
                )
            self._close_session(
                session_id=session_id,
                event_type="session.failed",
                message=f"Session failed: {error}",
                payload={"error": str(error)},
            )

    def _prepare_experiment_task(
        self,
        *,
        task: TaskRecord,
        session_id: str,
        workspace_repo_path: str,
    ) -> PreparedExperimentTask:
        experiment_id = _experiment_id_from_task(task) or self.repos.experiments.next_id(
            task.project_id
        )
        existing = self.repos.experiments.get(experiment_id)
        worktree = WorktreeManager(
            workspace_path=Path(workspace_repo_path),
            worktrees_dir=self.context.project_dir / "worktrees" / task.project_id,
        ).prepare(
            experiment_id=experiment_id,
            existing_worktree_path=existing.worktree_path if existing is not None else None,
            existing_base_commit=existing.base_commit if existing is not None else None,
        )

        if existing is None:
            experiment = self.repos.experiments.create(
                experiment_id=experiment_id,
                project_id=task.project_id,
                created_in_session_id=session_id,
                title=task.title,
                summary=task.content,
                status=WorkStatus.ACTIVE,
                worktree_path=str(worktree.workspace_path),
                base_commit=worktree.base_commit,
            )
            event = self.record_event(
                "experiment.created",
                f"Created experiment {experiment.id}",
                session_id=session_id,
                project_id=task.project_id,
                payload={"experiment_id": experiment.id},
            )
            self.publish_record(experiment, cursor=event.id)
        else:
            experiment = (
                self.repos.experiments.update(
                    experiment_id,
                    status=WorkStatus.ACTIVE,
                    worktree_path=str(worktree.workspace_path),
                    base_commit=worktree.base_commit,
                )
                or existing
            )

        link = self.repos.task_entity_links.create(
            project_id=task.project_id,
            task_id=task.id,
            entity_kind=TaskEntityKind.EXPERIMENT,
            entity_id=experiment.id,
            relationship="produces",
        )
        updated_task = (
            self.repos.tasks.update(
                task.id,
                payload={
                    **task.payload,
                    "experiment_id": experiment.id,
                    "worktree_path": str(worktree.workspace_path),
                    "base_commit": worktree.base_commit,
                },
            )
            or task
        )
        event = self.record_event(
            "experiment.worktree_ready",
            f"Prepared worktree for {experiment.id}",
            session_id=session_id,
            project_id=task.project_id,
            payload={
                "experiment_id": experiment.id,
                "task_id": task.id,
                "worktree_path": str(worktree.workspace_path),
                "worktree_root": str(worktree.worktree_root),
                "base_commit": worktree.base_commit,
            },
        )
        self.publish_record(experiment, cursor=event.id)
        self.publish_record(link, cursor=event.id)
        self.publish_record(updated_task, cursor=event.id)
        return PreparedExperimentTask(
            task=updated_task,
            experiment=experiment,
            repo_path=str(worktree.workspace_path),
        )

    def _complete_experiment_task(
        self,
        *,
        experiment_id: str,
        session_id: str,
        workspace_repo_path: str,
    ) -> None:
        experiment = self.repos.experiments.get(experiment_id)
        if experiment is None:
            return

        state: dict[str, object]
        if experiment.worktree_path is None:
            state = {"error": "experiment has no worktree_path"}
        else:
            try:
                state = WorktreeManager(
                    workspace_path=Path(workspace_repo_path),
                    worktrees_dir=self.context.project_dir / "worktrees" / experiment.project_id,
                ).inspect(Path(experiment.worktree_path)).model_dump()
            except RuntimeError as error:
                state = {"error": str(error), "workspace": experiment.worktree_path}

        activity = self.repos.experiment_activities.add(
            experiment_id=experiment.id,
            created_in_session_id=session_id,
            actor="harness",
            kind="comment",
            body=f"Captured final worktree state for {experiment.id}.",
            payload={
                "activity_type": "workspace_state",
                "base_commit": experiment.base_commit,
                "worktree": state,
            },
        )
        closed = self.repos.experiments.update(
            experiment.id,
            status=WorkStatus.CLOSED,
        ) or experiment
        event = self.record_event(
            "experiment.worktree_completed",
            f"Captured final worktree state for {experiment.id}",
            session_id=session_id,
            project_id=experiment.project_id,
            payload={
                "experiment_id": experiment.id,
                "activity_id": activity.id,
                "dirty": state.get("dirty") if isinstance(state, dict) else None,
            },
        )
        self.publish_record(activity, cursor=event.id)
        self.publish_record(closed, cursor=event.id)

    def _experiment_count(self, session_id: str) -> int:
        return len(self.repos.experiments.list_for_session(session_id))

    def _project_is_closed(self, project_id: str) -> bool:
        project = self.repos.projects.get(project_id)
        return project is not None and project.status == ProjectStatus.CLOSED

    def _close_session(
        self,
        *,
        session_id: str,
        event_type: str,
        message: str,
        payload: dict[str, Any] | None = None,
    ) -> None:
        session = self.repos.sessions.update_status(session_id, "closed")
        event = self.record_event(
            event_type,
            message,
            session_id=session_id,
            project_id=session.project_id if session is not None else None,
            payload=payload,
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


def _experiment_id_from_task(task: TaskRecord) -> str | None:
    experiment_id = task.payload.get("experiment_id")
    return experiment_id if isinstance(experiment_id, str) and experiment_id else None


def _agent_display_name(agent_kind: AgentKind) -> str:
    return {
        AgentKind.MANAGER: "Manager",
        AgentKind.RESEARCHER: "Researcher",
        AgentKind.SCIENTIST: "Scientist",
        AgentKind.CRITIC: "Critic",
    }[agent_kind]


class MethodNotFound(Exception):
    def __init__(self, method: str) -> None:
        super().__init__(method)
        self.method = method
