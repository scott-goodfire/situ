from __future__ import annotations

from typing import Any, Literal

from pydantic_ai import RunContext

from ....records import TaskKind, TaskPriority, TaskSourceKind
from ...common import BaseSituTool, SituToolDeps
from .models import CreateTaskResult

ExperimentBaseSelector = Literal[
    "selected_checkout",
    "parent_experiment",
    "explicit_commit",
]


class CreateTaskTool(BaseSituTool[SituToolDeps, CreateTaskResult]):
    name = "create_task"
    result_type = CreateTaskResult
    sequential = True

    async def execute(
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
        research_thread: str | None = None,
        parent_experiment_id: str | None = None,
        base_selector: ExperimentBaseSelector | None = None,
        base_commit: str | None = None,
        available_at: str | None = None,
        **_kwargs: Any,
    ) -> CreateTaskResult:
        """Create a project-scoped task for agent coordination."""
        repos = await ctx.deps.get_repos()
        project_id = await ctx.deps.require_project_id()
        session_id = ctx.deps.session_id
        resolved_task_id = task_id or await repos.tasks.next_id(project_id=project_id)
        resolved_payload = dict(payload or {})
        _add_if_present(resolved_payload, "research_thread", research_thread)
        _add_if_present(resolved_payload, "parent_experiment_id", parent_experiment_id)
        _add_if_present(resolved_payload, "base_selector", base_selector)
        _add_if_present(resolved_payload, "base_commit", base_commit)
        task = await repos.tasks.create(
            task_id=resolved_task_id,
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            content=content,
            kind=kind,
            priority=priority,
            source_kind=source_kind,
            parent_task_id=parent_task_id,
            payload=resolved_payload,
            available_at=available_at,
        )
        event = await ctx.deps.record_event(
            event_type="task.created",
            message=f"Created task {task.id}",
            payload={"task_id": task.id, "kind": task.kind.value},
        )
        await ctx.deps.publish_record(record=task, event=event)

        dependencies = []
        for blocked_by_task_id in blocked_by_task_ids or []:
            dependency = await repos.task_dependencies.create(
                project_id=project_id,
                task_id=task.id,
                blocked_by_task_id=blocked_by_task_id,
            )
            await ctx.deps.publish_record(record=dependency, event=event)
            dependencies.append(dependency.model_dump())

        return CreateTaskResult(
            success=True,
            task=task.model_dump(),
            dependencies=dependencies,
        )


def _add_if_present(payload: dict[str, Any], key: str, value: Any | None) -> None:
    if value is not None:
        payload[key] = value
