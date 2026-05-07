from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import GetTaskResult


class GetTaskTool(BaseSituTool[SituToolDeps, GetTaskResult]):
    name = "get_task"
    result_type = GetTaskResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        task_id: str,
        **_kwargs: Any,
    ) -> GetTaskResult:
        """Read one task and its local coordination context by explicit ID."""
        repos = ctx.deps.get_repos()
        task = repos.tasks.get(task_id=task_id)
        if task is None:
            return GetTaskResult(success=True, task=None)

        project_tasks = repos.tasks.list_for_project(project_id=task.project_id)
        parent_task = (
            repos.tasks.get(task_id=task.parent_task_id)
            if task.parent_task_id is not None
            else None
        )
        child_tasks = [
            candidate
            for candidate in project_tasks
            if candidate.parent_task_id == task.id
        ]
        task_dependencies = [
            dependency
            for dependency in repos.task_dependencies.list_for_project(project_id=task.project_id)
            if dependency.task_id == task.id
            or dependency.blocked_by_task_id == task.id
        ]
        return GetTaskResult(
            success=True,
            task=task.model_dump(),
            parent_task=parent_task.model_dump() if parent_task is not None else None,
            child_tasks=[child.model_dump() for child in child_tasks],
            task_dependencies=[
                dependency.model_dump() for dependency in task_dependencies
            ],
            task_entity_links=[
                link.model_dump()
                for link in repos.task_entity_links.list_for_task(task_id=task.id)
            ],
            task_activities=[
                activity.model_dump()
                for activity in repos.task_activities.list_for_task(task_id=task.id)
            ],
        )
