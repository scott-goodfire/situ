from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import TaskKind, TaskPriority, TaskSourceKind
from ...common import BaseSituTool, SituToolDeps
from .models import CreateTaskResult


class CreateTaskTool(BaseSituTool[SituToolDeps, CreateTaskResult]):
    name = "create_task"
    result_type = CreateTaskResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        content: str,
        kind: TaskKind,
        priority: TaskPriority = TaskPriority.NORMAL,
        source_kind: TaskSourceKind = TaskSourceKind.MANAGER,
        task_id: str | None = None,
        parent_task_id: str | None = None,
        blocked_by_task_ids: list[str] | None = None,
        payload: dict[str, Any] | None = None,
        available_at: str | None = None,
        **_kwargs: Any,
    ) -> CreateTaskResult:
        """Create a project-scoped task for agent coordination."""
        repos = ctx.deps.get_repos()
        project_id = ctx.deps.require_project_id()
        session_id = ctx.deps.session_id
        resolved_task_id = task_id or repos.tasks.next_id(project_id=project_id)
        task = repos.tasks.create(
            task_id=resolved_task_id,
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            content=content,
            kind=kind,
            priority=priority,
            source_kind=source_kind,
            parent_task_id=parent_task_id,
            payload=payload or {},
            available_at=available_at,
        )
        event = ctx.deps.record_event(
            event_type="task.created",
            message=f"Created task {task.id}",
            payload={"task_id": task.id, "kind": task.kind.value},
        )
        ctx.deps.publish_record(record=task, event=event)

        dependencies = []
        for blocked_by_task_id in blocked_by_task_ids or []:
            dependency = repos.task_dependencies.create(
                project_id=project_id,
                task_id=task.id,
                blocked_by_task_id=blocked_by_task_id,
            )
            ctx.deps.publish_record(record=dependency, event=event)
            dependencies.append(dependency.model_dump())

        return CreateTaskResult(
            success=True,
            task=task.model_dump(),
            dependencies=dependencies,
        )
