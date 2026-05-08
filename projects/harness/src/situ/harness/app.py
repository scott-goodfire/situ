from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import aiofiles
from dbos import DBOS

from situ.protocol import (
    ArtifactReadParams,
    ArtifactReadResult,
    CollectionsBootstrapParams,
    CollectionsBootstrapResult,
    CollectionsChangesSinceParams,
    CollectionsChangesSinceResult,
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

from .agent_runtime import AgentRuntime, get_agent_runtime
from .api.collections import (
    CollectionsService,
    publish_record_upsert,
)
from .api.current_state import CurrentStateService
from .api.project_overview import ProjectOverviewService
from .api.sessions import SessionsService
from .config import LocalSecretStore, SituSecrets
from .core.critic_review import sync_critic_review_work_items
from .core.db import Database
from .core.dbos.task_workflows import (
    _run_task_dispatch_sweep_once,
    cancel_session_workflows,
    enqueue_ready_critic_reviews,
    enqueue_task,
)
from .core.notifications import (
    NotificationWriter,
    register_project_notifications,
    set_project_collections_subscribed,
    set_project_events_subscribed,
)
from .core.project_context import ProjectContext
from .core.task_execution import (
    create_plan_task,
    ensure_default_local_target,
    fail_owned_evidence_records_for_task,
    finish_task,
    release_orphan_leases,
    release_compute_target,
)
from .core.worktrees import require_clean_if_git_workspace
from .records import (
    AgentKind,
    EventRecord,
    ProjectRecord,
    SessionStatus,
    TaskKind,
    TaskRecord,
    TaskStatus,
)
from .records.base import DbRecord
from .repositories import Repositories

ARTIFACT_CONTENT_BYTE_LIMIT = 1_000_000
TEST_CONTROLS_ENV = "SITU_TEST_CONTROLS"


class _TestWorkflowStatus:
    def __init__(self, value: dict[str, Any]) -> None:
        self.status = str(value.get("status", ""))
        self.name = str(value.get("name", "situ.test.workflow"))
        self.error = value.get("error")


def _truncate_patch_at_file_boundary(content: str) -> str:
    """Truncate a unified diff at the last `diff --git` boundary that fits.

    Cutting mid-line would yield a malformed patch that the renderer
    rejects, so prefer file boundaries; fall back to the last newline if
    even the first file exceeds the limit.
    """
    boundary = content.rfind("\ndiff --git")
    if boundary > 0:
        return content[: boundary + 1]
    last_newline = content.rfind("\n")
    if last_newline > 0:
        return content[: last_newline + 1]
    return content


def _resolve_project_artifact_path(*, project_dir: Path, artifact_path: str) -> Path:
    project_root = project_dir.resolve()
    raw_path = Path(artifact_path).expanduser()
    resolved = (
        raw_path if raw_path.is_absolute() else project_root / raw_path
    ).resolve()
    try:
        resolved.relative_to(project_root)
    except ValueError as error:
        raise ValueError("artifact path is outside project state") from error
    return resolved


async def _read_text_artifact(
    *,
    artifact_path: Path,
    media_type: str | None,
    limit: int,
) -> tuple[str, bool]:
    async with aiofiles.open(artifact_path, "rb") as file:
        raw = await file.read(limit + 1)
    truncated = len(raw) > limit
    content = raw[:limit].decode("utf-8", errors="replace")
    if truncated and media_type == "text/x-patch":
        content = _truncate_patch_at_file_boundary(content)
    return content, truncated


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
        self.project_overview_api = ProjectOverviewService(repos=self.repos)
        self.app_root = app_root
        self._agent_runtime: AgentRuntime | None = None
        self.notify = notify
        register_project_notifications(project_id=self.context.project_id, writer=notify)
        self.subscribed = False
        self.collection_subscribed = False

    @classmethod
    async def create(
        cls,
        workspace_root: Path,
        notify: NotificationWriter,
        app_root: Path | None = None,
        project_home: Path | None = None,
    ) -> "HarnessApp":
        context = await ProjectContext.create(workspace_root, home=project_home)
        app = cls(context=context, notify=notify, app_root=app_root)
        await ensure_default_local_target(app.repos)
        await release_orphan_leases(app.repos)
        return app

    async def handle_async(
        self,
        method: str,
        params: dict[str, Any] | None,
    ) -> dict[str, Any]:
        if method.startswith("test."):
            return await self._handle_test_control(method, params or {})

        handlers = {
            "harness.hello": self.hello,
            "setup.get": self.setup_get,
            "setup.complete": self.setup_complete,
            "secrets.status": self.secrets_status,
            "secrets.set_anthropic_key": self.secrets_set_anthropic_key,
            "collections.bootstrap": self.collections_bootstrap,
            "collections.subscribe": self.collections_subscribe,
            "collections.changes_since": self.collections_changes_since,
            "events.subscribe": self.events_subscribe,
            "session.resume": self.session_resume,
            "session.start": self.session_start,
            "session.status": self.session_status,
            "artifacts.read": self.artifacts_read,
        }
        handler = handlers.get(method)
        if handler is None:
            raise MethodNotFound(method)
        return await handler(params or {})

    async def _handle_test_control(
        self,
        method: str,
        params: dict[str, Any],
    ) -> dict[str, Any]:
        if os.environ.get(TEST_CONTROLS_ENV) != "1":
            raise MethodNotFound(method)
        handlers = {
            "test.seed_smoke_infrastructure_stall": (
                self.test_seed_smoke_infrastructure_stall
            ),
            "test.task_dispatch_sweep_once": self.test_task_dispatch_sweep_once,
        }
        handler = handlers.get(method)
        if handler is None:
            raise MethodNotFound(method)
        return await handler(params)

    async def test_seed_smoke_infrastructure_stall(
        self,
        params: dict[str, Any],
    ) -> dict[str, Any]:
        _ = params
        workspace = await self.repos.workspaces.ensure()
        project = await self.repos.projects.create(
            project_id=await self.repos.projects.next_id(workspace_id=workspace.id),
            workspace_id=workspace.id,
            title="Smoke infrastructure stall",
            objective="Simulate stale compute and unclaimed DBOS task workflows.",
            research_context=(
                "This e2e fixture mirrors a smoke run where DBOS workflows "
                "existed but did not claim their task rows."
            ),
        )
        session = await self.repos.sessions.create(
            session_id=await self.repos.sessions.next_id(),
            workspace_id=workspace.id,
            project_id=project.id,
        )
        scientist = await self.repos.agents.create(
            agent_id=f"agent_{project.id}_scientist_stall",
            project_id=project.id,
            created_in_session_id=session.id,
            kind=AgentKind.SCIENTIST,
            display_name="Scientist Stall Fixture",
        )

        stale_task = await self.repos.tasks.create(
            task_id=await self.repos.tasks.next_id(project_id=project.id),
            project_id=project.id,
            created_in_session_id=session.id,
            title="Stale claimed compute task",
            content="This task simulates a Scientist workflow that stopped making progress.",
            kind=TaskKind.EXPERIMENT,
            priority="high",
            source_kind="system",
        )
        await self.repos.tasks.set_workflow_id(
            task_id=stale_task.id,
            workflow_id=f"task:{stale_task.id}:a1",
        )
        claimed_task = await self.repos.tasks.claim(
            task_id=stale_task.id,
            agent_id=scientist.id,
            eligible_kinds=[TaskKind.EXPERIMENT],
            claimed_in_session_id=session.id,
        )
        if claimed_task is None:
            raise RuntimeError(f"could not claim fixture task: {stale_task.id}")

        target = await self.repos.compute_targets.claim_for_pool(
            pool="local",
            task_id=stale_task.id,
        )
        if target is None:
            raise RuntimeError("could not claim default local compute target")

        old = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        await self.repos.tasks.db.execute(
            "UPDATE tasks SET claimed_at = ?, updated_at = ? WHERE id = ?",
            (old, old, stale_task.id),
        )
        await self.repos.compute_targets.db.execute(
            """
            UPDATE compute_targets
            SET claimed_at = ?, last_heartbeat = ?, updated_at = ?
            WHERE id = ?
            """,
            (old, old, old, target.id),
        )

        stuck_workflow_ids: list[str] = []
        stuck_task_ids: list[str] = []
        for index in range(1, 4):
            task = await self.repos.tasks.create(
                task_id=await self.repos.tasks.next_id(project_id=project.id),
                project_id=project.id,
                created_in_session_id=session.id,
                title=f"Unclaimed workflow task {index}",
                content="This workflow reached DBOS PENDING but never claimed the task.",
                kind=TaskKind.PLAN,
                priority="high",
                source_kind="system",
            )
            workflow_id = f"task:{task.id}:a1"
            await self.repos.tasks.set_workflow_id(
                task_id=task.id,
                workflow_id=workflow_id,
            )
            await self.repos.tasks.db.execute(
                "UPDATE tasks SET updated_at = ? WHERE id = ?",
                (old, task.id),
            )
            stuck_task_ids.append(task.id)
            stuck_workflow_ids.append(workflow_id)

        runnable = await self.repos.tasks.create(
            task_id=await self.repos.tasks.next_id(project_id=project.id),
            project_id=project.id,
            created_in_session_id=session.id,
            title="Runnable task after unhealthy scheduler",
            content="This task should remain backlog after the scheduler closes the session.",
            kind=TaskKind.PLAN,
            priority="normal",
            source_kind="system",
        )

        return {
            "project_id": project.id,
            "session_id": session.id,
            "stale_task_id": stale_task.id,
            "stuck_task_ids": stuck_task_ids,
            "stuck_workflow_ids": stuck_workflow_ids,
            "runnable_task_id": runnable.id,
            "compute_target_id": target.id,
        }

    async def test_task_dispatch_sweep_once(
        self,
        params: dict[str, Any],
    ) -> dict[str, Any]:
        raw_statuses = params.get("workflow_statuses", {})
        statuses = raw_statuses if isinstance(raw_statuses, dict) else {}

        async def workflow_status_getter(workflow_id: str) -> Any:
            value = statuses.get(workflow_id)
            if isinstance(value, dict):
                return _TestWorkflowStatus(value)
            return await DBOS.get_workflow_status_async(workflow_id)

        return await _run_task_dispatch_sweep_once(
            repos=self.repos,
            home=self.context.home,
            app_root=str(self.app_root) if self.app_root is not None else None,
            workflow_status_getter=workflow_status_getter,
        )

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
        await self.publish_record(record=workspace, cursor=event.id)
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

    async def collections_changes_since(self, params: dict[str, Any]) -> dict[str, Any]:
        request = CollectionsChangesSinceParams.model_validate(params)
        result = await self.collections_api.changes_since(
            scope_id=self.context.workspace_id,
            cursor=request.cursor,
            limit=request.limit,
        )
        return CollectionsChangesSinceResult.model_validate(result).model_dump()

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
                await self.notify("event.appended", {"event": event.model_dump()})
                replayed += 1
        return EventsSubscribeResult(subscribed=True, replayed=replayed).model_dump()

    async def session_start(self, params: dict[str, Any]) -> dict[str, Any]:
        start = SessionStartParams.model_validate(params)
        await require_clean_if_git_workspace(
            self.context.repo_root,
            action="starting a Situ session",
        )
        workspace = await self.repos.workspaces.ensure()
        await self._abandon_active_workspace_sessions(workspace_id=workspace.id)
        session_id = (await self.sessions_api.next_session_id()).session_id
        project = await self._project_from_start(start, workspace_id=workspace.id)

        session = await self.repos.sessions.create(
            session_id=session_id,
            workspace_id=workspace.id,
            project_id=project.id,
        )
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
        await self.publish_record(record=workspace, cursor=event.id)
        await self.publish_record(record=project, cursor=event.id)
        await self.publish_record(record=session, cursor=event.id)
        await self._ensure_project_agents(session_id=session_id, project_id=project.id)
        # Warm the agent runtime (registers DBOS queues + workflows) before
        # enqueueing the first task. Workflows fan out from there.
        await self._get_agent_runtime()
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
        await self.publish_record(record=session, cursor=event.id)

        if session.project_id is not None:
            await self._ensure_project_agents(
                session_id=resume.session_id,
                project_id=session.project_id,
            )
            await self._get_agent_runtime()
            review_work_items = await sync_critic_review_work_items(
                repos=self.repos,
                project_id=session.project_id,
                session_id=resume.session_id,
            )
            if review_work_items:
                await enqueue_ready_critic_reviews(
                    repos=self.repos,
                    session_id=resume.session_id,
                    project_id=session.project_id,
                    trigger_id=f"event:{event.id}",
                    workspace_root=str(self.context.repo_root),
                    home=str(self.context.home),
                    app_root=str(self.app_root) if self.app_root is not None else None,
                )
            else:
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

    async def artifacts_read(self, params: dict[str, Any]) -> dict[str, Any]:
        request = ArtifactReadParams.model_validate(params)
        artifact = await self.repos.artifacts.get(artifact_id=request.artifact_id)
        if artifact is None:
            raise ValueError(f"artifact not found: {request.artifact_id}")

        artifact_path = _resolve_project_artifact_path(
            project_dir=self.context.project_dir,
            artifact_path=artifact.path,
        )
        if not artifact_path.is_file():
            raise ValueError(f"artifact file not found: {artifact.id}")

        content, truncated = await _read_text_artifact(
            artifact_path=artifact_path,
            media_type=artifact.media_type,
            limit=ARTIFACT_CONTENT_BYTE_LIMIT,
        )
        return ArtifactReadResult(
            artifact_id=artifact.id,
            media_type=artifact.media_type,
            size_bytes=artifact.size_bytes,
            content=content,
            truncated=truncated,
            truncated_at_bytes=ARTIFACT_CONTENT_BYTE_LIMIT if truncated else None,
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
            await self.notify("event.appended", {"event": event.model_dump()})
        await self.publish_record(record=event, cursor=event.id)
        return event

    async def publish_record(
        self,
        *,
        record: DbRecord,
        cursor: int,
    ) -> None:
        await publish_record_upsert(
            project_id=self.context.project_id,
            record=record,
            cursor=cursor,
            repos=self.repos,
            scope_id=self.context.workspace_id,
        )

    async def _abandon_active_workspace_sessions(self, *, workspace_id: str) -> None:
        active_sessions = [
            session
            for session in await self.repos.sessions.list_for_workspace(
                workspace_id=workspace_id,
            )
            if session.status == SessionStatus.ACTIVE
        ]
        for session in active_sessions:
            await cancel_session_workflows(self.repos, session_id=session.id)
            project_id = session.project_id
            task_ids: set[str] = set()
            if project_id is not None:
                tasks = [
                    task
                    for task in await self.repos.tasks.list_for_project(
                        project_id=project_id,
                    )
                    if task.created_in_session_id == session.id
                    or task.claimed_in_session_id == session.id
                ]
                for task in tasks:
                    task_ids.add(task.id)
                    await self._abandon_task_for_session(
                        task=task,
                        session_id=session.id,
                    )

                for target in await self.repos.compute_targets.list_claimed():
                    task_id = target.claimed_by_task_id
                    if task_id is None or task_id not in task_ids:
                        continue
                    await release_compute_target(
                        repos=self.repos,
                        target_id=target.id,
                        task_id=task_id,
                        session_id=session.id,
                        project_id=project_id,
                    )

            updated = await self.repos.sessions.update_status(
                session_id=session.id,
                status=SessionStatus.CLOSED,
            )
            event = await self.record_event(
                event_type="session.abandoned",
                message=f"Abandoned {session.id} before starting a new session.",
                session_id=session.id,
                project_id=project_id,
                payload={"reason": "new_session_started"},
            )
            if updated is not None:
                await self.publish_record(record=updated, cursor=event.id)

    async def _abandon_task_for_session(
        self,
        *,
        task: TaskRecord,
        session_id: str,
    ) -> None:
        terminal = {TaskStatus.DONE, TaskStatus.CANCELED, TaskStatus.FAILED}
        if task.status in terminal:
            return
        if task.status == TaskStatus.IN_PROGRESS:
            status = TaskStatus.FAILED
            summary = (
                "Task failed because a new session started before this "
                "session finished."
            )
        else:
            status = TaskStatus.CANCELED
            summary = (
                "Task canceled because a new session started before this "
                "session finished."
            )
        await finish_task(
            repos=self.repos,
            task=task,
            session_id=session_id,
            status=status,
            result_summary=summary,
            force_terminal_update=True,
        )
        await fail_owned_evidence_records_for_task(
            repos=self.repos,
            task=task,
            session_id=session_id,
            reason=summary,
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
        await self.publish_record(record=agent, cursor=event.id)

    async def _enqueue_plan_task(
        self,
        *,
        session_id: str,
        project_id: str,
        title: str,
        content: str,
        source_kind: str,
    ) -> TaskRecord:
        task = await create_plan_task(
            self.repos,
            session_id=session_id,
            project_id=project_id,
            title=title,
            content=content,
            source_kind=source_kind,
        )
        await enqueue_task(
            repos=self.repos,
            task=task,
            session_id=session_id,
            project_id=project_id,
            workspace_root=str(self.context.repo_root),
            home=str(self.context.home),
            app_root=str(self.app_root) if self.app_root is not None else None,
        )
        return task


    async def _close_session(
        self,
        *,
        session_id: str,
        event_type: str,
        message: str,
        payload: dict[str, Any] | None = None,
    ) -> None:
        await cancel_session_workflows(self.repos, session_id=session_id)
        session = await self.repos.sessions.update_status(session_id=session_id, status="closed")
        event = await self.record_event(
            event_type=event_type,
            message=message,
            session_id=session_id,
            project_id=session.project_id if session is not None else None,
            payload=payload,
        )
        if session is not None:
            await self.publish_record(record=session, cursor=event.id)

    async def _get_agent_runtime(self) -> AgentRuntime:
        if self._agent_runtime is None:
            self._agent_runtime = await get_agent_runtime(self.context.project_dir)
        return self._agent_runtime


class MethodNotFound(Exception):
    def __init__(self, method: str) -> None:
        super().__init__(method)
        self.method = method
