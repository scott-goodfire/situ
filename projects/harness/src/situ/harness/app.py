from __future__ import annotations

import asyncio
import threading
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable

import aiofiles
import aiofiles.os
from situ.protocol import (
    CollectionsBootstrapParams,
    CollectionsBootstrapResult,
    CollectionsSubscribeParams,
    CollectionsSubscribeResult,
    EventsSubscribeParams,
    EventsSubscribeResult,
    HarnessHelloParams,
    HarnessHelloResult,
    SecretsSetAnthropicKeyParams,
    SecretsSetAnthropicKeyResult,
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
from .core.git import git_lines, git_stdout, git_text
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
    ExperimentActivityRecord,
    ExperimentRecord,
    HypothesisActivityRecord,
    ProjectRecord,
    ProjectStatus,
    SessionStatus,
    TaskEntityKind,
    TaskKind,
    TaskRecord,
    TaskStatus,
    TaskWorkType,
    WorkStatus,
)

ReviewActivity = HypothesisActivityRecord | ExperimentActivityRecord
from .records.base import DbRecord
from .repositories import Repositories
from .tools.tasks.eligibility import eligible_task_kinds_for_agent

NotificationWriter = Callable[[str, dict[str, Any]], None]

MANAGER_NO_PROGRESS_LIMIT = 25
SESSION_AGENT_PASS_LIMIT_MINIMUM = 32
SESSION_AGENT_PASS_LIMIT_PER_EXPERIMENT = 8
AGENT_PASS_TIMEOUT_RETRIES = 1
REUSABLE_PLAN_TASK_TITLE = "Plan next step"
REUSABLE_PLAN_TASK_KEY = "project-next-step"
EXPERIMENT_BASE_SELECTORS = {
    "selected_checkout",
    "parent_experiment",
    "explicit_commit",
}


@dataclass(frozen=True, slots=True)
class PreparedExperimentTask:
    task: TaskRecord
    experiment: ExperimentRecord
    repo_path: str


class HarnessApp:
    def __init__(
        self,
        context: ProjectContext,
        notify: NotificationWriter,
        app_root: Path | None = None,
    ) -> None:
        self.context = context
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
        register_project_notifications(project_id=self.context.project_id, writer=notify)
        self.subscribed = False
        self.collection_subscribed = False
        self._session_setup: dict[str, dict[str, str]] = {}

    @classmethod
    async def create(
        cls,
        workspace_root: Path,
        notify: NotificationWriter,
        app_root: Path | None = None,
        project_home: Path | None = None,
    ) -> "HarnessApp":
        context = await ProjectContext.create(workspace_root, home=project_home)
        return cls(context=context, notify=notify, app_root=app_root)

    async def handle_async(
        self,
        method: str,
        params: dict[str, Any] | None,
    ) -> dict[str, Any]:
        handlers = {
            "harness.hello": self.hello,
            "setup.get": self.setup_get,
            "setup.complete": self.setup_complete,
            "secrets.status": self.secrets_status,
            "secrets.set_anthropic_key": self.secrets_set_anthropic_key,
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
        return await handler(params or {})

    async def hello(self, params: dict[str, Any]) -> dict[str, Any]:
        hello = HarnessHelloParams.model_validate(params)
        return HarnessHelloResult(message=f"hello, {hello.name} from the Python harness").model_dump()

    async def setup_get(self, params: dict[str, Any]) -> dict[str, Any]:
        SetupGetParams.model_validate(params)
        workspace = await self.repos.workspaces.get()
        return SetupGetResult(
            configured=workspace is not None,
            workspace=workspace.model_dump() if workspace is not None else None,
        ).model_dump()

    async def setup_complete(self, params: dict[str, Any]) -> dict[str, Any]:
        SetupCompleteParams.model_validate(params)
        workspace = await self.repos.workspaces.ensure()
        event = await self.record_event(
            event_type="setup.completed",
            message="Configured workspace context",
            payload={"workspace_id": workspace.id},
        )
        self.publish_record(record=workspace, cursor=event.id)
        return SetupCompleteResult(workspace=workspace.model_dump()).model_dump()

    async def secrets_status(self, params: dict[str, Any]) -> dict[str, Any]:
        SecretsStatusParams.model_validate(params)
        secrets = SituSecrets()
        source = await secrets.anthropic_key_source(home=self.context.home)
        logfire_source = await secrets.logfire_token_source(home=self.context.home)
        return SecretsStatusResult(
            anthropic_key_configured=source != "missing",
            anthropic_key_source=source,
            logfire_token_configured=logfire_source != "missing",
            logfire_token_source=logfire_source,
        ).model_dump()

    async def secrets_set_anthropic_key(self, params: dict[str, Any]) -> dict[str, Any]:
        secret = SecretsSetAnthropicKeyParams.model_validate(params)
        store = LocalSecretStore(home=self.context.home)
        await store.set_anthropic_key(secret.anthropic_key)
        if secret.logfire_token is not None and secret.logfire_token.strip():
            await store.set_logfire_token(secret.logfire_token)
        secrets = SituSecrets()
        await secrets.apply_local_sdk_environment(home=self.context.home)
        logfire_source = await secrets.logfire_token_source(home=self.context.home)
        return SecretsSetAnthropicKeyResult(
            logfire_token_configured=logfire_source != "missing",
            logfire_token_source=logfire_source,
        ).model_dump()

    async def collections_bootstrap(self, params: dict[str, Any]) -> dict[str, Any]:
        CollectionsBootstrapParams.model_validate(params)
        bootstrap = await self.collections_api.bootstrap(workspace_id=self.context.workspace_id)
        return CollectionsBootstrapResult.model_validate(bootstrap.model_dump()).model_dump()

    async def collections_subscribe(self, params: dict[str, Any]) -> dict[str, Any]:
        CollectionsSubscribeParams.model_validate(params)
        self.collection_subscribed = True
        set_project_collections_subscribed(project_id=self.context.project_id, subscribed=True)
        return CollectionsSubscribeResult(
            subscribed=True,
            cursor=await self.collections_api.current_cursor(
                workspace_id=self.context.workspace_id
            ),
        ).model_dump()

    async def events_subscribe(self, params: dict[str, Any]) -> dict[str, Any]:
        subscribe = EventsSubscribeParams.model_validate(params)
        self.subscribed = True
        set_project_events_subscribed(project_id=self.context.project_id, subscribed=True)
        replayed = 0
        if subscribe.replay_existing:
            project_ids = {
                project.id
                for project in await self.repos.projects.list_for_workspace(
                    workspace_id=self.context.workspace_id
                )
            }
            session_ids = {
                session.id
                for session in await self.repos.sessions.list_for_workspace(
                    workspace_id=self.context.workspace_id
                )
            }
            for event in await self.repos.events.list_all():
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

    async def session_start(self, params: dict[str, Any]) -> dict[str, Any]:
        start = SessionStartParams.model_validate(params)
        await require_clean_if_git_workspace(
            self.context.repo_root,
            action="starting a Situ session",
        )
        workspace = await self.repos.workspaces.ensure()
        session_id = (await self.sessions_api.next_session_id()).session_id
        project = await self._project_from_start(start, workspace_id=workspace.id)

        session = await self.repos.sessions.create(
            session_id=session_id,
            workspace_id=workspace.id,
            project_id=project.id,
        )
        self._session_setup[session_id] = {
            "objective": project.objective,
            "research_context": project.research_context,
        }
        event = await self.record_event(
            event_type="session.started",
            message=f"Started {session_id}",
            session_id=session_id,
            project_id=project.id,
            payload={
                "workspace_id": workspace.id,
                "project_id": project.id,
                "objective": project.objective,
                "research_context": project.research_context,
            },
        )
        self.publish_record(record=workspace, cursor=event.id)
        self.publish_record(record=project, cursor=event.id)
        self.publish_record(record=session, cursor=event.id)
        await self._ensure_project_agents(session_id=session_id, project_id=project.id)
        await self._enqueue_plan_task(
            session_id=session_id,
            project_id=project.id,
            title="Plan first research pass",
            content=(
                "Read the session project, objective, research context, current "
                "project state, and task board. File the next focused Researcher "
                "or Scientist task or tasks."
            ),
            source_kind="system",
        )

        self._start_session_thread(
            session_id=session_id,
            max_experiments=start.max_experiments,
        )

        return SessionStartResult(session_id=session_id, status="active").model_dump()

    async def session_resume(self, params: dict[str, Any]) -> dict[str, Any]:
        resume = SessionResumeParams.model_validate(params)
        session = await self.repos.sessions.get(session_id=resume.session_id)
        if session is None:
            raise RuntimeError(f"session not found: {resume.session_id}")

        session = await self.repos.sessions.update_status(session_id=resume.session_id, status="active") or session
        event = await self.record_event(
            event_type="session.resumed",
            message=f"Resumed {resume.session_id}",
            session_id=resume.session_id,
            project_id=session.project_id,
        )
        self.publish_record(record=session, cursor=event.id)

        self._session_setup.setdefault(
            resume.session_id,
            await self._setup_from_records(resume.session_id),
        )
        if session.project_id is not None:
            await self._ensure_project_agents(
                session_id=resume.session_id,
                project_id=session.project_id,
            )
            await self._enqueue_plan_task(
                session_id=resume.session_id,
                project_id=session.project_id,
                title="Plan resumed research pass",
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

    async def session_status(self, params: dict[str, Any]) -> dict[str, Any]:
        status = SessionStatusParams.model_validate(params)
        session = await self.repos.sessions.get(session_id=status.session_id)
        return SessionStatusResult(
            session=session.model_dump() if session is not None else None
        ).model_dump()

    async def record_event(
        self,
        *,
        event_type: str,
        message: str,
        session_id: str | None = None,
        project_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> EventRecord:
        event = await self.repos.events.add(
            event_type=event_type,
            message=message,
            associated_project_id=project_id,
            associated_session_id=session_id,
            payload=payload,
        )
        if self.subscribed:
            self.notify("event.appended", {"event": event.model_dump()})
        self.publish_record(record=event, cursor=event.id)
        return event

    def publish_record(
        self,
        *,
        record: DbRecord,
        cursor: int,
    ) -> None:
        publish_record_upsert(
            project_id=self.context.project_id,
            record=record,
            cursor=cursor,
        )

    async def _project_from_start(
        self,
        start: SessionStartParams,
        *,
        workspace_id: str,
    ) -> ProjectRecord:
        requested_project_id = getattr(start, "project_id", None)
        if requested_project_id:
            project = await self.repos.projects.get(project_id=requested_project_id)
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
        return await self.repos.projects.create(
            project_id=await self.repos.projects.next_id(workspace_id=workspace_id),
            workspace_id=workspace_id,
            title=title,
            objective=objective,
            research_context=research_context,
        )

    async def _ensure_project_agents(self, *, session_id: str, project_id: str) -> None:
        existing = await self.repos.agents.get_for_project_kind(
            project_id=project_id,
            kind=AgentKind.MANAGER,
        )
        agent = await self.repos.agents.ensure_project_agent(
            project_id=project_id,
            created_in_session_id=session_id,
            kind=AgentKind.MANAGER,
            display_name="Manager",
        )
        if existing is not None:
            return
        event = await self.record_event(
            event_type="agent.created",
            message="Created Manager agent",
            session_id=session_id,
            project_id=project_id,
            payload={"agent_id": agent.id, "kind": agent.kind.value},
        )
        self.publish_record(record=agent, cursor=event.id)

    async def _enqueue_plan_task(
        self,
        *,
        session_id: str,
        project_id: str,
        title: str,
        content: str,
        source_kind: str,
    ) -> TaskRecord:
        previous = await self._reusable_plan_task(project_id=project_id)
        pass_count = _planning_pass_count(previous)
        payload = {
            **(previous.payload if previous is not None else {}),
            "reuse_key": REUSABLE_PLAN_TASK_KEY,
            "planning_pass_count": pass_count + 1,
            "last_trigger_title": title,
            "last_enqueued_in_session_id": session_id,
        }
        if previous is None:
            task = await self.repos.tasks.create(
                task_id=await self.repos.tasks.next_id(project_id=project_id),
                project_id=project_id,
                created_in_session_id=session_id,
                title=REUSABLE_PLAN_TASK_TITLE,
                content=content,
                kind=TaskKind.PLAN,
                priority="high",
                source_kind=source_kind,
                payload=payload,
            )
            event_type = "task.created"
            event_message = f"Created task {task.id}"
            activity_type = "planning_task_queued"
        else:
            task = await self.repos.tasks.requeue(
                task_id=previous.id,
                title=REUSABLE_PLAN_TASK_TITLE,
                content=content,
                priority="high",
                source_kind=source_kind,
                payload=payload,
            )
            if task is None:
                raise RuntimeError(f"planning task was not requeued: {previous.id}")
            event_type = "task.requeued"
            event_message = f"Requeued planning task {task.id}"
            activity_type = "planning_task_requeued"

        event = await self.record_event(
            event_type=event_type,
            message=event_message,
            session_id=session_id,
            project_id=project_id,
            payload={
                "task_id": task.id,
                "kind": task.kind.value,
                "planning_pass_count": payload["planning_pass_count"],
            },
        )
        activity = await self.repos.task_activities.add(
            project_id=project_id,
            task_id=task.id,
            created_in_session_id=session_id,
            actor="system",
            kind="comment",
            body=f"Queued planning pass: {title}.",
            payload={
                "activity_type": activity_type,
                "trigger_title": title,
                "planning_pass_count": payload["planning_pass_count"],
            },
        )
        self.publish_record(record=task, cursor=event.id)
        self.publish_record(record=activity, cursor=event.id)
        return task

    async def _reusable_plan_task(self, *, project_id: str) -> TaskRecord | None:
        candidates = [
            task
            for task in await self.repos.tasks.list_for_project(project_id=project_id)
            if _is_reusable_plan_task(task)
            and task.status not in {TaskStatus.ABANDONED, TaskStatus.FAILED}
        ]
        if not candidates:
            return None
        return sorted(candidates, key=lambda task: task.created_at)[0]

    async def _enqueue_experiment_review_task(
        self,
        *,
        session_id: str,
        project_id: str,
        experiment_id: str,
        source_task_id: str,
    ) -> TaskRecord:
        existing_review_task = await self._existing_experiment_review_task(
            project_id=project_id,
            experiment_id=experiment_id,
        )
        if existing_review_task is not None:
            return existing_review_task

        experiment = await self.repos.experiments.get(experiment_id=experiment_id)
        evaluations = await self.repos.evaluations.list_for_experiment(experiment_id=experiment_id)
        measurements = [
            measurement
            for evaluation in evaluations
            for measurement in await self.repos.measurements.list_for_evaluation(
                evaluation_id=evaluation.id
            )
        ]
        title = (
            f"Review {experiment.title}"
            if experiment is not None and experiment.title
            else f"Review {experiment_id}"
        )
        task = await self.repos.tasks.create(
            task_id=await self.repos.tasks.next_id(project_id=project_id),
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
            work_type=TaskWorkType.REVIEW_EXPERIMENT,
            priority="high",
            source_kind="system",
            payload={
                "experiment_id": experiment_id,
                "source_task_id": source_task_id,
                "evaluation_ids": [evaluation.id for evaluation in evaluations],
                "measurement_ids": [measurement.id for measurement in measurements],
            },
        )
        links = [
            await self.repos.task_entity_links.create(
                project_id=project_id,
                task_id=task.id,
                entity_kind=TaskEntityKind.EXPERIMENT,
                entity_id=experiment_id,
                relationship="reviews",
            )
        ]
        for evaluation in evaluations:
            links.append(
                await self.repos.task_entity_links.create(
                    project_id=project_id,
                    task_id=task.id,
                    entity_kind=TaskEntityKind.EVALUATION,
                    entity_id=evaluation.id,
                    relationship="reviews",
                )
            )
        for measurement in measurements:
            links.append(
                await self.repos.task_entity_links.create(
                    project_id=project_id,
                    task_id=task.id,
                    entity_kind=TaskEntityKind.MEASUREMENT,
                    entity_id=measurement.id,
                    relationship="reviews",
                )
            )
        event = await self.record_event(
            event_type="task.created",
            message=f"Created review task {task.id}",
            session_id=session_id,
            project_id=project_id,
            payload={
                "task_id": task.id,
                "kind": task.kind.value,
                "experiment_id": experiment_id,
            },
        )
        self.publish_record(record=task, cursor=event.id)
        for link in links:
            self.publish_record(record=link, cursor=event.id)
        return task

    async def _existing_experiment_review_task(
        self,
        *,
        project_id: str,
        experiment_id: str,
    ) -> TaskRecord | None:
        for task in await self.repos.tasks.list_for_project(project_id=project_id):
            if (
                task.kind == TaskKind.REVIEW
                and task.payload.get("experiment_id") == experiment_id
            ):
                return task
        return None

    async def _route_review_followup(
        self,
        *,
        session_id: str,
        review_task: TaskRecord,
    ) -> TaskRecord | None:
        """File one bounded producer-lane repair task when a review asks for it.

        Returns the new task, or None when the review needs no scoped repair
        (Manager handles direction, human review, or accepted results).
        """
        if review_task.work_type is None:
            return None

        if review_task.work_type == TaskWorkType.REVIEW_HYPOTHESIS:
            return await self._route_hypothesis_review_followup(
                session_id=session_id,
                review_task=review_task,
            )
        if review_task.work_type == TaskWorkType.REVIEW_EXPERIMENT:
            return await self._route_experiment_review_followup(
                session_id=session_id,
                review_task=review_task,
            )
        return None

    async def _route_hypothesis_review_followup(
        self,
        *,
        session_id: str,
        review_task: TaskRecord,
    ) -> TaskRecord | None:
        hypothesis_id = review_task.payload.get("hypothesis_id")
        if not isinstance(hypothesis_id, str):
            return None
        latest = await self._review_activity_for_task(
            session_id=session_id,
            review_task_id=review_task.id,
            activities=await self.repos.hypothesis_activities.list_for_hypothesis(
                hypothesis_id=hypothesis_id
            ),
        )
        if latest is None:
            return None
        if not _review_wants_scoped_repair(latest.payload):
            return None
        if await self._existing_followup_for_review(
            project_id=review_task.project_id,
            review_activity_id=latest.id,
        ) is not None:
            return None
        return await self._create_hypothesis_repair_task(
            session_id=session_id,
            review_task=review_task,
            hypothesis_id=hypothesis_id,
            review_activity_id=latest.id,
            review_payload=latest.payload,
        )

    async def _route_experiment_review_followup(
        self,
        *,
        session_id: str,
        review_task: TaskRecord,
    ) -> TaskRecord | None:
        experiment_id = review_task.payload.get("experiment_id")
        if not isinstance(experiment_id, str):
            return None
        latest = await self._review_activity_for_task(
            session_id=session_id,
            review_task_id=review_task.id,
            activities=await self.repos.experiment_activities.list_for_experiment(
                experiment_id=experiment_id
            ),
        )
        if latest is None:
            return None
        if not _experiment_review_wants_reproduction(latest.payload):
            return None
        if await self._existing_followup_for_review(
            project_id=review_task.project_id,
            review_activity_id=latest.id,
        ) is not None:
            return None
        return await self._create_experiment_reproduction_task(
            session_id=session_id,
            review_task=review_task,
            experiment_id=experiment_id,
            review_activity_id=latest.id,
            review_payload=latest.payload,
        )

    async def _review_activity_for_task(
        self,
        *,
        session_id: str,
        review_task_id: str,
        activities: Sequence[ReviewActivity],
    ) -> ReviewActivity | None:
        """Find the Critic review activity tied to this review task.

        Prefers an exact `review_task_id` payload match (set by the review tools
        in current versions). Falls back to the most recent same-session
        `critic_review` activity for backward compatibility with prior reviews.
        """
        for activity in reversed(activities):
            if activity.payload.get("review_task_id") == review_task_id:
                return activity
        for activity in reversed(activities):
            if (
                activity.created_in_session_id == session_id
                and activity.payload.get("activity_type") == "critic_review"
            ):
                return activity
        return None

    async def _existing_followup_for_review(
        self,
        *,
        project_id: str,
        review_activity_id: int,
    ) -> TaskRecord | None:
        for task in await self.repos.tasks.list_for_project(project_id=project_id):
            if task.payload.get("associated_review_activity_id") == review_activity_id:
                return task
        return None

    async def _create_hypothesis_repair_task(
        self,
        *,
        session_id: str,
        review_task: TaskRecord,
        hypothesis_id: str,
        review_activity_id: int,
        review_payload: dict[str, Any],
    ) -> TaskRecord:
        project_id = review_task.project_id
        hypothesis = await self.repos.hypotheses.get(hypothesis_id=hypothesis_id)
        title = (
            f"Revise {hypothesis.title}"
            if hypothesis is not None and hypothesis.title
            else f"Revise {hypothesis_id}"
        )
        verdict = review_payload.get("verdict", "concern")
        concern_kinds = review_payload.get("concern_kinds") or []
        concern_summary = ", ".join(concern_kinds) if concern_kinds else "the recorded concerns"
        task = await self.repos.tasks.create(
            task_id=await self.repos.tasks.next_id(project_id=project_id),
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            content=(
                f"Address the Critic review on {hypothesis_id}. The verdict was "
                f"`{verdict}`. Read the review activity, the hypothesis, and any "
                "linked analyses, then revise or supersede the hypothesis to "
                f"resolve {concern_summary}. Stop when the hypothesis is concrete "
                "and grounded enough for an experiment, or record why the concern "
                "cannot be resolved without human input."
            ),
            kind=TaskKind.HYPOTHESIZE,
            priority="high",
            source_kind="system",
            payload={
                "associated_hypothesis_id": hypothesis_id,
                "associated_review_activity_id": review_activity_id,
                "associated_review_task_id": review_task.id,
            },
        )
        links = [
            await self.repos.task_entity_links.create(
                project_id=project_id,
                task_id=task.id,
                entity_kind=TaskEntityKind.HYPOTHESIS,
                entity_id=hypothesis_id,
                relationship="revises",
            ),
            await self.repos.task_entity_links.create(
                project_id=project_id,
                task_id=task.id,
                entity_kind=TaskEntityKind.HYPOTHESIS_ACTIVITY,
                entity_id=str(review_activity_id),
                relationship="addresses",
            ),
        ]
        event = await self.record_event(
            event_type="task.created",
            message=f"Created hypothesis repair task {task.id}",
            session_id=session_id,
            project_id=project_id,
            payload={
                "task_id": task.id,
                "kind": task.kind.value,
                "hypothesis_id": hypothesis_id,
                "review_activity_id": review_activity_id,
            },
        )
        self.publish_record(record=task, cursor=event.id)
        for link in links:
            self.publish_record(record=link, cursor=event.id)
        return task

    async def _create_experiment_reproduction_task(
        self,
        *,
        session_id: str,
        review_task: TaskRecord,
        experiment_id: str,
        review_activity_id: int,
        review_payload: dict[str, Any],
    ) -> TaskRecord:
        project_id = review_task.project_id
        experiment = await self.repos.experiments.get(experiment_id=experiment_id)
        title = (
            f"Reproduce {experiment.title}"
            if experiment is not None and experiment.title
            else f"Reproduce {experiment_id}"
        )
        verdict = review_payload.get("verdict", "needs_reproduction")
        concern_kinds = review_payload.get("concern_kinds") or []
        concern_summary = ", ".join(concern_kinds) if concern_kinds else "the recorded concerns"
        task = await self.repos.tasks.create(
            task_id=await self.repos.tasks.next_id(project_id=project_id),
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            content=(
                f"Address the Critic review on {experiment_id}. The verdict was "
                f"`{verdict}`. Re-run the experiment under controlled conditions "
                "and record fresh measurement evidence so the result can be "
                f"trusted, focusing on {concern_summary}. Stop when the new "
                "evidence either supports or refutes the prior result."
            ),
            kind=TaskKind.EXPERIMENT,
            priority="high",
            source_kind="system",
            payload={
                "associated_experiment_id": experiment_id,
                "parent_experiment_id": experiment_id,
                "base_selector": "parent_experiment",
                "associated_review_activity_id": review_activity_id,
                "associated_review_task_id": review_task.id,
            },
        )
        links = [
            await self.repos.task_entity_links.create(
                project_id=project_id,
                task_id=task.id,
                entity_kind=TaskEntityKind.EXPERIMENT,
                entity_id=experiment_id,
                relationship="reproduces",
            ),
            await self.repos.task_entity_links.create(
                project_id=project_id,
                task_id=task.id,
                entity_kind=TaskEntityKind.EXPERIMENT_ACTIVITY,
                entity_id=str(review_activity_id),
                relationship="addresses",
            ),
        ]
        event = await self.record_event(
            event_type="task.created",
            message=f"Created experiment reproduction task {task.id}",
            session_id=session_id,
            project_id=project_id,
            payload={
                "task_id": task.id,
                "kind": task.kind.value,
                "experiment_id": experiment_id,
                "review_activity_id": review_activity_id,
            },
        )
        self.publish_record(record=task, cursor=event.id)
        for link in links:
            self.publish_record(record=link, cursor=event.id)
        return task

    async def _claim_next_task(
        self,
        *,
        session_id: str,
        agent_kind: AgentKind,
    ) -> TaskRecord | None:
        session = await self.repos.sessions.get(session_id=session_id)
        if session is None or session.project_id is None:
            return None

        eligible_kinds = eligible_task_kinds_for_agent(agent_kind)
        if agent_kind == AgentKind.MANAGER:
            agent = await self.repos.agents.ensure_project_agent(
                project_id=session.project_id,
                created_in_session_id=session_id,
                kind=agent_kind,
                display_name=_agent_display_name(agent_kind),
            )
            task = await self.repos.tasks.claim_next(
                project_id=session.project_id,
                agent_id=agent.id,
                eligible_kinds=eligible_kinds,
                claimed_in_session_id=session_id,
            )
        else:
            task = None
            agent = None
            for candidate in await self.repos.tasks.list_runnable_for_project(
                project_id=session.project_id,
                eligible_kinds=eligible_kinds,
            ):
                display_name = f"{_agent_display_name(agent_kind)} {candidate.id}"
                existing_agent = await self.repos.agents.get(
                    agent_id=f"agent_{session.project_id}_{agent_kind.value}_{candidate.id}"
                )
                candidate_agent = await self.repos.agents.ensure_task_agent(
                    project_id=session.project_id,
                    task_id=candidate.id,
                    created_in_session_id=session_id,
                    kind=agent_kind,
                    display_name=display_name,
                )
                if existing_agent is None:
                    created_event = await self.record_event(
                        event_type="agent.created",
                        message=f"Created {display_name} agent",
                        session_id=session_id,
                        project_id=session.project_id,
                        payload={
                            "agent_id": candidate_agent.id,
                            "kind": candidate_agent.kind.value,
                            "task_id": candidate.id,
                        },
                    )
                    self.publish_record(record=candidate_agent, cursor=created_event.id)
                claimed = await self.repos.tasks.claim(
                    task_id=candidate.id,
                    agent_id=candidate_agent.id,
                    eligible_kinds=eligible_kinds,
                    claimed_in_session_id=session_id,
                )
                if claimed is not None:
                    task = claimed
                    agent = candidate_agent
                    break

        if task is None:
            return None
        if agent is None:
            raise RuntimeError(f"missing agent for claimed task {task.id}")
        updated_agent = await self.repos.agents.update(agent_id=agent.id, status=AgentStatus.ACTIVE) or agent
        event = await self.record_event(
            event_type="task.claimed",
            message=f"Claimed task {task.id}",
            session_id=session_id,
            project_id=session.project_id,
            payload={"task_id": task.id, "agent_id": agent.id},
        )
        self.publish_record(record=task, cursor=event.id)
        self.publish_record(record=updated_agent, cursor=event.id)
        return task

    async def _finish_claimed_task(
        self,
        *,
        task: TaskRecord,
        session_id: str,
        status: TaskStatus,
        result_summary: str,
    ) -> None:
        current = await self.repos.tasks.get(task_id=task.id) or task
        terminal_statuses = {TaskStatus.DONE, TaskStatus.ABANDONED, TaskStatus.FAILED}
        if current.status in terminal_statuses:
            if current.assignee_id is not None:
                updated_agent = await self.repos.agents.update(
                    agent_id=current.assignee_id,
                    status=AgentStatus.IDLE,
                )
                if updated_agent is not None:
                    self.publish_record(
                        record=updated_agent,
                        cursor=await self.collections_api.current_cursor(
                            workspace_id=self.context.workspace_id
                        ),
                    )
            return
        updated_task = await self.repos.tasks.update(
            task_id=task.id,
            status=status,
            result_summary=current.result_summary or result_summary,
            completed_in_session_id=session_id,
        )
        if updated_task is None:
            return
        updated_agent = (
            await self.repos.agents.update(agent_id=updated_task.assignee_id, status=AgentStatus.IDLE)
            if updated_task.assignee_id is not None
            else None
        )
        event = await self.record_event(
            event_type=f"task.{updated_task.status.value}",
            message=f"Finished task {updated_task.id}",
            session_id=session_id,
            project_id=updated_task.project_id,
            payload={
                "task_id": updated_task.id,
                "status": updated_task.status.value,
            },
        )
        activity = None
        if _is_reusable_plan_task(updated_task):
            activity = await self.repos.task_activities.add(
                project_id=updated_task.project_id,
                task_id=updated_task.id,
                created_in_session_id=session_id,
                actor="system",
                kind="comment",
                body=f"Completed planning pass: {updated_task.result_summary or result_summary}",
                payload={
                    "activity_type": "planning_task_completed",
                    "planning_pass_count": _planning_pass_count(updated_task),
                    "status": updated_task.status.value,
                },
            )
        self.publish_record(record=updated_task, cursor=event.id)
        if activity is not None:
            self.publish_record(record=activity, cursor=event.id)
        if updated_agent is not None:
            self.publish_record(record=updated_agent, cursor=event.id)

    async def _execute_session_async(
        self,
        *,
        session_id: str,
        max_experiments: int,
    ) -> None:
        active_task: TaskRecord | None = None
        try:
            workspace = await self.repos.workspaces.get()
            session = await self.repos.sessions.get(session_id=session_id)
            if workspace is None or session is None:
                raise RuntimeError("missing workspace setup")

            setup = self._session_setup.get(session_id) or await self._setup_from_records(
                session_id
            )
            runtime = await self._get_agent_runtime()
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
                    session = await self.repos.sessions.get(session_id=session_id)
                    if session is None or session.status == SessionStatus.CLOSED:
                        return
                    if (
                        session.project_id is not None
                        and await self._project_is_closed(session.project_id)
                    ):
                        completion_summary = "Project is closed."
                        break

                    if agent_passes >= max_agent_passes:
                        completion_summary = (
                            "Stopped after reaching the session agent-pass "
                            f"guardrail ({max_agent_passes} passes)."
                        )
                        break

                    critic_task = await self._claim_next_task(
                        session_id=session_id,
                        agent_kind=AgentKind.CRITIC,
                    )
                    if critic_task is not None:
                        active_task = critic_task
                        no_progress_plans = 0
                        agent_passes += 1
                        result = await self._run_agent_pass(
                            session_id=session_id,
                            project_id=critic_task.project_id,
                            task=critic_task,
                            agent_kind=AgentKind.CRITIC,
                            run=lambda: runtime.run_review(
                                workspace=workspace.model_dump(),
                                setup_objective=setup.get("objective", ""),
                                setup_research_context=setup.get("research_context", ""),
                                session_id=session_id,
                                assigned_task_ids=[critic_task.id],
                                app_root=self.app_root,
                                repos=self.repos,
                            ),
                        )
                        completion_summary = result.summary
                        await self._finish_claimed_task(
                            task=critic_task,
                            session_id=session_id,
                            status=TaskStatus.DONE,
                            result_summary=result.summary,
                        )
                        await self.record_event(
                            event_type="session.critic_completed",
                            message=result.summary,
                            session_id=session_id,
                            project_id=critic_task.project_id,
                            payload=result.model_dump(),
                        )
                        active_task = None

                        followup = await self._route_review_followup(
                            session_id=session_id,
                            review_task=critic_task,
                        )

                        if followup is None and await self._experiment_count(
                            session_id
                        ) < max_experiments:
                            await self._enqueue_plan_task(
                                session_id=session_id,
                                project_id=critic_task.project_id,
                                title="Plan from critic review",
                                content=(
                                    "A Critic review just completed. Review the "
                                    "review activity, concerns, project state, "
                                    "task board, and experiment budget. File the "
                                    "next focused Researcher or Scientist task so "
                                    "the research loop keeps moving."
                                ),
                                source_kind="system",
                            )
                        continue

                    completed_experiments = await self._experiment_count(session_id)
                    remaining_experiments = max(
                        0,
                        max_experiments - completed_experiments,
                    )
                    if remaining_experiments <= 0:
                        completion_summary = (
                            f"Completed {max_experiments} experiment budget."
                        )
                        break

                    manager_task = await self._claim_next_task(
                        session_id=session_id,
                        agent_kind=AgentKind.MANAGER,
                    )
                    if manager_task is not None:
                        active_task = manager_task
                        agent_passes += 1
                        manager_result = await self._run_agent_pass(
                            session_id=session_id,
                            project_id=manager_task.project_id,
                            task=manager_task,
                            agent_kind=AgentKind.MANAGER,
                            run=lambda: runtime.plan_session(
                                workspace=workspace.model_dump(),
                                setup_objective=setup.get("objective", ""),
                                setup_research_context=setup.get("research_context", ""),
                                assigned_task_ids=[manager_task.id],
                                session_id=session_id,
                                repos=self.repos,
                            ),
                        )
                        completion_summary = manager_result.summary
                        await self.record_event(
                            event_type="session.manager_completed",
                            message=manager_result.summary,
                            session_id=session_id,
                            project_id=manager_task.project_id,
                            payload=manager_result.model_dump(),
                        )
                        await self._finish_claimed_task(
                            task=manager_task,
                            session_id=session_id,
                            status=TaskStatus.DONE,
                            result_summary=manager_result.summary,
                        )
                        active_task = None
                        if await self._project_is_closed(manager_task.project_id):
                            completion_summary = (
                                "Project was closed by Manager confirmation."
                            )
                            break

                    researcher_task = await self._claim_next_task(
                        session_id=session_id,
                        agent_kind=AgentKind.RESEARCHER,
                    )
                    if researcher_task is not None:
                        active_task = researcher_task
                        no_progress_plans = 0
                        agent_passes += 1
                        result = await self._run_agent_pass(
                            session_id=session_id,
                            project_id=researcher_task.project_id,
                            task=researcher_task,
                            agent_kind=AgentKind.RESEARCHER,
                            run=lambda: runtime.run_research(
                                workspace=workspace.model_dump(),
                                setup_objective=setup.get("objective", ""),
                                setup_research_context=setup.get("research_context", ""),
                                session_id=session_id,
                                assigned_task_ids=[researcher_task.id],
                                app_root=self.app_root,
                                repos=self.repos,
                            ),
                        )
                        completion_summary = result.summary
                        await self._finish_claimed_task(
                            task=researcher_task,
                            session_id=session_id,
                            status=TaskStatus.DONE,
                            result_summary=result.summary,
                        )
                        await self.record_event(
                            event_type="session.researcher_completed",
                            message=result.summary,
                            session_id=session_id,
                            project_id=researcher_task.project_id,
                            payload=result.model_dump(),
                        )
                        active_task = None
                        await self._enqueue_plan_task(
                            session_id=session_id,
                            project_id=researcher_task.project_id,
                            title="Plan next research step",
                            content=(
                                "A Researcher task just completed. Review the "
                                "project board and research records, task board, recent activity, "
                                "analyses, and hypotheses. File the next focused "
                                "Researcher or Scientist task so the research loop "
                                "keeps moving."
                            ),
                            source_kind="system",
                        )
                        continue

                    scientist_task = await self._claim_next_task(
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
                            prepared_experiment = await self._prepare_experiment_task(
                                task=scientist_task,
                                session_id=session_id,
                                workspace_repo_path=workspace.repo_path,
                            )
                            scientist_task = prepared_experiment.task
                            active_task = scientist_task
                            execution_repo_path = prepared_experiment.repo_path
                            active_experiment_id = prepared_experiment.experiment.id

                        try:
                            result = await self._run_agent_pass(
                                session_id=session_id,
                                project_id=scientist_task.project_id,
                                task=scientist_task,
                                agent_kind=AgentKind.SCIENTIST,
                                run=lambda: runtime.run_session(
                                    workspace=workspace.model_dump(),
                                    setup_objective=setup.get("objective", ""),
                                    setup_research_context=setup.get(
                                        "research_context", ""
                                    ),
                                    session_id=session_id,
                                    max_experiments=remaining_experiments,
                                    assigned_task_ids=[scientist_task.id],
                                    app_root=self.app_root,
                                    repos=self.repos,
                                    repo_path=execution_repo_path,
                                    active_experiment_id=active_experiment_id,
                                ),
                            )
                        finally:
                            if prepared_experiment is not None:
                                await self._complete_experiment_task(
                                    experiment_id=prepared_experiment.experiment.id,
                                    session_id=session_id,
                                    workspace_repo_path=workspace.repo_path,
                                )
                        completion_summary = result.summary
                        await self._finish_claimed_task(
                            task=scientist_task,
                            session_id=session_id,
                            status=TaskStatus.DONE,
                            result_summary=result.summary,
                        )
                        await self.record_event(
                            event_type="session.agent_completed",
                            message=result.summary,
                            session_id=session_id,
                            project_id=scientist_task.project_id,
                            payload=result.model_dump(),
                        )
                        active_task = None

                        if scientist_task.kind == TaskKind.EXPERIMENT:
                            assert active_experiment_id is not None
                            await self._enqueue_experiment_review_task(
                                session_id=session_id,
                                project_id=scientist_task.project_id,
                                experiment_id=active_experiment_id,
                                source_task_id=scientist_task.id,
                            )
                        else:
                            await self._enqueue_plan_task(
                                session_id=session_id,
                                project_id=scientist_task.project_id,
                                title="Plan next experiment step",
                                content=(
                                    "A Scientist task just completed. Review the "
                                    "project board and research records, task board, recent activity, "
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
                    await self._enqueue_plan_task(
                        session_id=session_id,
                        project_id=project_id,
                        title="Plan runnable next step",
                        content=(
                            "The previous planning cycle did not leave a "
                            "runnable Researcher, Scientist, or Critic task. Re-read the project "
                            "objective, project state, and task board, then file one "
                            "focused runnable Researcher or Scientist task unless "
                            "there is a hard blocker."
                        ),
                        source_kind="system",
                    )

            await self._close_session(
                session_id=session_id,
                event_type="session.completed",
                message=f"Completed {session_id}: {completion_summary}",
                payload={"summary": completion_summary},
            )
        except Exception as error:
            if active_task is not None:
                await self._finish_claimed_task(
                    task=active_task,
                    session_id=session_id,
                    status=TaskStatus.FAILED,
                    result_summary=str(error),
                )
            await self._close_session(
                session_id=session_id,
                event_type="session.failed",
                message=f"Session failed: {error}",
                payload={"error": str(error)},
            )

    async def _run_agent_pass(
        self,
        *,
        session_id: str,
        project_id: str,
        task: TaskRecord,
        agent_kind: AgentKind,
        run: Callable[[], Awaitable[Any]],
    ) -> Any:
        max_attempts = AGENT_PASS_TIMEOUT_RETRIES + 1
        for attempt in range(1, max_attempts + 1):
            try:
                return await run()
            except Exception as error:
                if not _is_timeout_or_cancellation_error(error):
                    raise
                will_retry = attempt < max_attempts
                await self._record_agent_pass_timeout(
                    session_id=session_id,
                    project_id=project_id,
                    task=task,
                    agent_kind=agent_kind,
                    error=error,
                    attempt=attempt,
                    max_attempts=max_attempts,
                    will_retry=will_retry,
                )
                if not will_retry:
                    raise
        raise RuntimeError("agent pass retry loop ended unexpectedly")

    async def _record_agent_pass_timeout(
        self,
        *,
        session_id: str,
        project_id: str,
        task: TaskRecord,
        agent_kind: AgentKind,
        error: Exception,
        attempt: int,
        max_attempts: int,
        will_retry: bool,
    ) -> None:
        action = "retrying" if will_retry else "failing session"
        label = agent_kind.value.capitalize()
        payload = {
            "activity_type": "agent_pass_timeout",
            "agent_kind": agent_kind.value,
            "task_id": task.id,
            "attempt": attempt,
            "max_attempts": max_attempts,
            "will_retry": will_retry,
            "error_type": type(error).__name__,
            "error": str(error),
        }
        activity = await self.repos.task_activities.add(
            project_id=project_id,
            task_id=task.id,
            actor="system",
            kind="comment",
            body=(
                f"{label} pass timed out or was cancelled on attempt "
                f"{attempt}/{max_attempts}; {action}."
            ),
            created_in_session_id=session_id,
            payload=payload,
        )
        event = await self.record_event(
            event_type="session.agent_timeout",
            message=(
                f"{label} pass timed out on {task.id}; "
                f"{'retrying' if will_retry else 'no retries remain'}."
            ),
            session_id=session_id,
            project_id=project_id,
            payload=payload,
        )
        self.publish_record(record=activity, cursor=event.id)

    async def _prepare_experiment_task(
        self,
        *,
        task: TaskRecord,
        session_id: str,
        workspace_repo_path: str,
    ) -> PreparedExperimentTask:
        experiment_id = _experiment_id_from_task(task) or await self.repos.experiments.next_id(
            project_id=task.project_id
        )
        existing = await self.repos.experiments.get(experiment_id=experiment_id)
        parent_experiment_id = (
            existing.parent_experiment_id
            if existing is not None and existing.parent_experiment_id is not None
            else _parent_experiment_id_from_task(task)
        )
        parent_experiment = None
        if parent_experiment_id is not None:
            parent_experiment = await self.repos.experiments.get(
                experiment_id=parent_experiment_id
            )
            if parent_experiment is None or parent_experiment.project_id != task.project_id:
                raise RuntimeError(
                    f"experiment task references unknown parent experiment: "
                    f"{parent_experiment_id}"
                )
        research_thread = (
            existing.research_thread
            if existing is not None and existing.research_thread is not None
            else _research_thread_from_task(task)
            or (parent_experiment.research_thread if parent_experiment is not None else None)
        )
        requested_base_commit = (
            existing.base_commit
            if existing is not None and existing.base_commit is not None
            else _requested_base_commit_from_task(task, parent_experiment)
        )
        worktree = await WorktreeManager(
            workspace_path=Path(workspace_repo_path),
            worktrees_dir=self.context.project_dir / "worktrees" / task.project_id,
        ).prepare(
            experiment_id=experiment_id,
            existing_worktree_path=existing.worktree_path if existing is not None else None,
            existing_base_commit=existing.base_commit if existing is not None else None,
            requested_base_commit=requested_base_commit,
        )

        if existing is None:
            experiment = await self.repos.experiments.create(
                experiment_id=experiment_id,
                project_id=task.project_id,
                created_in_session_id=session_id,
                title=task.title,
                summary=task.content,
                status=WorkStatus.ACTIVE,
                worktree_path=str(worktree.workspace_path),
                base_commit=worktree.base_commit,
                parent_experiment_id=parent_experiment_id,
                research_thread=research_thread,
            )
            event = await self.record_event(
                event_type="experiment.created",
                message=f"Created experiment {experiment.id}",
                session_id=session_id,
                project_id=task.project_id,
                payload={"experiment_id": experiment.id},
            )
            self.publish_record(record=experiment, cursor=event.id)
        else:
            experiment = (
                await self.repos.experiments.update(
                    experiment_id=experiment_id,
                    status=WorkStatus.ACTIVE,
                    worktree_path=str(worktree.workspace_path),
                    base_commit=worktree.base_commit,
                    parent_experiment_id=parent_experiment_id,
                    research_thread=research_thread,
                )
                or existing
            )

        link = await self.repos.task_entity_links.create(
            project_id=task.project_id,
            task_id=task.id,
            entity_kind=TaskEntityKind.EXPERIMENT,
            entity_id=experiment.id,
            relationship="produces",
        )
        updated_task = (
            await self.repos.tasks.update(
                task_id=task.id,
                payload={
                    **task.payload,
                    "experiment_id": experiment.id,
                    "worktree_path": str(worktree.workspace_path),
                    "base_commit": worktree.base_commit,
                    **(
                        {"parent_experiment_id": parent_experiment_id}
                        if parent_experiment_id is not None
                        else {}
                    ),
                    **(
                        {"research_thread": research_thread}
                        if research_thread is not None
                        else {}
                    ),
                },
            )
            or task
        )
        event = await self.record_event(
            event_type="experiment.worktree_ready",
            message=f"Prepared worktree for {experiment.id}",
            session_id=session_id,
            project_id=task.project_id,
            payload={
                "experiment_id": experiment.id,
                "task_id": task.id,
                "worktree_path": str(worktree.workspace_path),
                "worktree_root": str(worktree.worktree_root),
                "base_commit": worktree.base_commit,
                "parent_experiment_id": parent_experiment_id,
                "research_thread": research_thread,
            },
        )
        self.publish_record(record=experiment, cursor=event.id)
        self.publish_record(record=link, cursor=event.id)
        self.publish_record(record=updated_task, cursor=event.id)
        return PreparedExperimentTask(
            task=updated_task,
            experiment=experiment,
            repo_path=str(worktree.workspace_path),
        )

    async def _complete_experiment_task(
        self,
        *,
        experiment_id: str,
        session_id: str,
        workspace_repo_path: str,
    ) -> None:
        experiment = await self.repos.experiments.get(experiment_id=experiment_id)
        if experiment is None:
            return

        state: dict[str, object]
        candidate_commit: str | None = None
        candidate_ref: str | None = None
        patch_artifact_id: str | None = None
        patch_error: str | None = None
        post_commit_state: dict[str, object] | None = None
        if experiment.worktree_path is None:
            state = {"error": "experiment has no worktree_path"}
        else:
            try:
                candidate_state = await WorktreeManager(
                    workspace_path=Path(workspace_repo_path),
                    worktrees_dir=self.context.project_dir / "worktrees" / experiment.project_id,
                ).capture_candidate_state(
                    Path(experiment.worktree_path),
                    experiment_id=experiment.id,
                    base_commit=experiment.base_commit,
                )
                state = candidate_state.worktree.model_dump()
                candidate_commit = candidate_state.candidate_commit
                candidate_ref = candidate_state.candidate_ref
                post_commit_state = candidate_state.post_commit_worktree.model_dump()
                if candidate_commit is not None:
                    patch_artifact_id = await self._capture_experiment_patch_artifact(
                        experiment=experiment,
                        session_id=session_id,
                        candidate_commit=candidate_commit,
                        candidate_ref=candidate_ref,
                    )
            except RuntimeError as error:
                state = {"error": str(error), "workspace": experiment.worktree_path}
                patch_error = str(error)

        activity_payload = {
            "activity_type": "workspace_state",
            "base_commit": experiment.base_commit,
            "candidate_commit": candidate_commit,
            "candidate_ref": candidate_ref,
            "worktree": state,
        }
        if patch_artifact_id is not None:
            activity_payload["patch_artifact_id"] = patch_artifact_id
        if patch_error is not None:
            activity_payload["patch_error"] = patch_error
        if post_commit_state is not None:
            activity_payload["post_commit_worktree"] = post_commit_state

        activity = await self.repos.experiment_activities.add(
            experiment_id=experiment.id,
            created_in_session_id=session_id,
            actor="harness",
            kind="comment",
            body=f"Captured final worktree state for {experiment.id}.",
            payload=activity_payload,
        )
        closed = await self.repos.experiments.update(
            experiment_id=experiment.id,
            status=WorkStatus.CLOSED,
            candidate_commit=candidate_commit,
        ) or experiment
        event = await self.record_event(
            event_type="experiment.worktree_completed",
            message=f"Captured final worktree state for {experiment.id}",
            session_id=session_id,
            project_id=experiment.project_id,
            payload={
                "experiment_id": experiment.id,
                "activity_id": activity.id,
                "dirty": state.get("dirty") if isinstance(state, dict) else None,
                "candidate_commit": candidate_commit,
            },
        )
        self.publish_record(record=activity, cursor=event.id)
        self.publish_record(record=closed, cursor=event.id)

    async def _capture_experiment_patch_artifact(
        self,
        *,
        experiment: ExperimentRecord,
        session_id: str,
        candidate_commit: str,
        candidate_ref: str | None,
    ) -> str | None:
        if experiment.base_commit is None or experiment.worktree_path is None:
            return None

        worktree_path = Path(experiment.worktree_path)
        git_root = await git_text(worktree_path, "rev-parse", "--show-toplevel")
        if not git_root:
            raise RuntimeError(
                f"could not resolve git root for experiment {experiment.id}"
            )

        patch = await git_stdout(
            Path(git_root),
            "diff",
            "--binary",
            experiment.base_commit,
            candidate_commit,
        )
        changed_files = await git_lines(
            Path(git_root),
            "diff",
            "--name-only",
            experiment.base_commit,
            candidate_commit,
        )
        diff_stat = await git_text(
            Path(git_root),
            "diff",
            "--stat",
            experiment.base_commit,
            candidate_commit,
        )
        if not patch.strip():
            return None

        artifact_id = await self.repos.artifacts.next_id(project_id=experiment.project_id)
        patch_dir = self.context.project_dir / "artifacts" / "patches" / experiment.project_id
        await aiofiles.os.makedirs(patch_dir, exist_ok=True)
        patch_path = patch_dir / f"{artifact_id}-{experiment.id}.patch"
        async with aiofiles.open(patch_path, "w", encoding="utf-8") as file:
            await file.write(patch)

        artifact = await self.repos.artifacts.create(
            artifact_id=artifact_id,
            project_id=experiment.project_id,
            created_in_session_id=session_id,
            associated_entity_kind="experiment",
            associated_entity_id=experiment.id,
            kind="patch",
            title=f"Patch handoff from {experiment.id}",
            path=_artifact_path_for_record(
                artifact_path=patch_path,
                project_dir=self.context.project_dir,
            ),
            media_type="text/x-patch",
            size_bytes=patch_path.stat().st_size,
        )
        linked_tasks = await self.repos.task_entity_links.list_for_entity(
            entity_kind=TaskEntityKind.EXPERIMENT,
            entity_id=experiment.id,
        )
        artifact_links = [
            await self.repos.task_entity_links.create(
                project_id=experiment.project_id,
                task_id=link.task_id,
                entity_kind=TaskEntityKind.ARTIFACT,
                entity_id=artifact.id,
                relationship="produces",
            )
            for link in linked_tasks
        ]
        activity = await self.repos.experiment_activities.add(
            experiment_id=experiment.id,
            created_in_session_id=session_id,
            actor="harness",
            kind="comment",
            body=(
                f"Captured patch artifact {artifact.id} from {experiment.id}. "
                f"Apply explicitly with `situ apply {artifact.id}`."
            ),
            payload={
                "activity_type": "patch_handoff",
                "patch_status": "captured",
                "artifact_id": artifact.id,
                "base_commit": experiment.base_commit,
                "candidate_commit": candidate_commit,
                "candidate_ref": candidate_ref,
                "changed_files": changed_files,
                "diff_stat": diff_stat,
                "apply_command": f"situ apply {artifact.id}",
            },
        )
        event = await self.record_event(
            event_type="experiment.patch_captured",
            message=f"Captured patch artifact {artifact.id} from {experiment.id}",
            session_id=session_id,
            project_id=experiment.project_id,
            payload={
                "experiment_id": experiment.id,
                "artifact_id": artifact.id,
                "changed_files": changed_files,
                "candidate_commit": candidate_commit,
            },
        )
        self.publish_record(record=artifact, cursor=event.id)
        for link in artifact_links:
            self.publish_record(record=link, cursor=event.id)
        self.publish_record(record=activity, cursor=event.id)
        return artifact.id

    async def _experiment_count(self, session_id: str) -> int:
        return len(await self.repos.experiments.list_for_session(session_id=session_id))

    async def _project_is_closed(self, project_id: str) -> bool:
        project = await self.repos.projects.get(project_id=project_id)
        return project is not None and project.status == ProjectStatus.CLOSED

    async def _close_session(
        self,
        *,
        session_id: str,
        event_type: str,
        message: str,
        payload: dict[str, Any] | None = None,
    ) -> None:
        session = await self.repos.sessions.update_status(session_id=session_id, status="closed")
        event = await self.record_event(
            event_type=event_type,
            message=message,
            session_id=session_id,
            project_id=session.project_id if session is not None else None,
            payload=payload,
        )
        if session is not None:
            self.publish_record(record=session, cursor=event.id)

    async def _setup_from_records(self, session_id: str) -> dict[str, str]:
        session = await self.repos.sessions.get(session_id=session_id)
        project = (
            await self.repos.projects.get(project_id=session.project_id)
            if session is not None and session.project_id is not None
            else None
        )
        return {
            "objective": project.objective if project is not None else "",
            "research_context": project.research_context if project is not None else "",
        }

    async def _get_agent_runtime(self) -> AgentRuntime:
        if self._agent_runtime is None:
            self._agent_runtime = await AgentRuntime.create(self.context.project_dir)
        return self._agent_runtime

    def _start_session_thread(
        self,
        *,
        session_id: str,
        max_experiments: int,
    ) -> None:
        def run_session() -> None:
            asyncio.run(
                self._execute_session_async(
                    session_id=session_id,
                    max_experiments=max_experiments,
                )
            )

        thread = threading.Thread(
            target=run_session,
            daemon=True,
        )
        thread.start()


def _planning_pass_count(task: TaskRecord | None) -> int:
    if task is None:
        return 0
    raw_count = task.payload.get("planning_pass_count", 0)
    try:
        return int(raw_count)
    except (TypeError, ValueError):
        return 0


def _is_reusable_plan_task(task: TaskRecord) -> bool:
    return (
        task.kind == TaskKind.PLAN
        and task.payload.get("reuse_key") == REUSABLE_PLAN_TASK_KEY
    )


_HYPOTHESIS_REPAIR_VERDICTS = {"concern", "needs_more_evidence"}
_HYPOTHESIS_REPAIR_NEXT_STEPS = {"revise"}
_EXPERIMENT_REPRODUCE_VERDICTS = {"concern", "needs_reproduction"}
_EXPERIMENT_REPRODUCE_NEXT_STEPS = {"reproduce", "revise"}


def _review_wants_scoped_repair(payload: dict[str, Any]) -> bool:
    verdict = payload.get("verdict")
    next_step = payload.get("recommended_next_step")
    return (
        verdict in _HYPOTHESIS_REPAIR_VERDICTS
        and next_step in _HYPOTHESIS_REPAIR_NEXT_STEPS
    )


def _experiment_review_wants_reproduction(payload: dict[str, Any]) -> bool:
    verdict = payload.get("verdict")
    next_step = payload.get("recommended_next_step")
    return (
        verdict in _EXPERIMENT_REPRODUCE_VERDICTS
        and next_step in _EXPERIMENT_REPRODUCE_NEXT_STEPS
    )


def _is_timeout_or_cancellation_error(error: BaseException) -> bool:
    seen: set[int] = set()
    stack: list[BaseException | None] = [error]
    while stack:
        current = stack.pop()
        if current is None or id(current) in seen:
            continue
        seen.add(id(current))
        name = type(current).__name__.lower()
        message = str(current).lower()
        if (
            "timeout" in name
            or "timedout" in name
            or name in {
                "dbosworkflowcancellederror",
                "dbosawaitedworkflowcancellederror",
            }
            or ("workflow" in name and "cancel" in name)
            or "timed out" in message
            or "timeout" in message
        ):
            return True
        stack.extend((current.__cause__, current.__context__))
    return False


def _experiment_id_from_task(task: TaskRecord) -> str | None:
    experiment_id = task.payload.get("experiment_id")
    return experiment_id if isinstance(experiment_id, str) and experiment_id else None


def _parent_experiment_id_from_task(task: TaskRecord) -> str | None:
    parent_experiment_id = task.payload.get("parent_experiment_id")
    if not isinstance(parent_experiment_id, str) or not parent_experiment_id:
        parent_experiment_id = task.payload.get("base_experiment_id")
    return (
        parent_experiment_id
        if isinstance(parent_experiment_id, str) and parent_experiment_id
        else None
    )


def _base_commit_from_task(task: TaskRecord) -> str | None:
    base_commit = task.payload.get("base_commit")
    return base_commit if isinstance(base_commit, str) and base_commit else None


def _base_selector_from_task(task: TaskRecord) -> str | None:
    base_selector = task.payload.get("base_selector")
    return base_selector if isinstance(base_selector, str) and base_selector else None


def _requested_base_commit_from_task(
    task: TaskRecord,
    parent_experiment: ExperimentRecord | None,
) -> str | None:
    base_selector = _base_selector_from_task(task)
    if base_selector is not None and base_selector not in EXPERIMENT_BASE_SELECTORS:
        allowed = ", ".join(sorted(EXPERIMENT_BASE_SELECTORS))
        raise RuntimeError(
            f"invalid experiment base_selector: {base_selector!r}; use one of {allowed}"
        )

    if base_selector == "selected_checkout":
        return None
    if base_selector == "parent_experiment":
        return _base_commit_from_parent_experiment(parent_experiment)
    if base_selector == "explicit_commit":
        base_commit = _base_commit_from_task(task)
        if base_commit is None:
            raise RuntimeError(
                "experiment task selected explicit_commit base but did not provide base_commit"
            )
        return base_commit

    base_commit = _base_commit_from_task(task)
    if base_commit is not None:
        return base_commit
    if parent_experiment is not None:
        return _base_commit_from_parent_experiment(parent_experiment)
    return None


def _base_commit_from_parent_experiment(
    parent_experiment: ExperimentRecord | None,
) -> str:
    if parent_experiment is None:
        raise RuntimeError(
            "experiment task selected parent_experiment base but did not provide "
            "parent_experiment_id"
        )
    base_commit = parent_experiment.candidate_commit or parent_experiment.base_commit
    if base_commit is None:
        raise RuntimeError(
            f"parent experiment {parent_experiment.id} has no candidate or base commit"
        )
    return base_commit


def _research_thread_from_task(task: TaskRecord) -> str | None:
    research_thread = task.payload.get("research_thread")
    if not isinstance(research_thread, str) or not research_thread:
        research_thread = task.payload.get("thread")
    return research_thread if isinstance(research_thread, str) and research_thread else None


def _artifact_path_for_record(*, artifact_path: Path, project_dir: Path) -> str:
    try:
        return str(artifact_path.relative_to(project_dir))
    except ValueError:
        return str(artifact_path)


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
