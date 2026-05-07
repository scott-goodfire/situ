from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import GetTaskBoardResult


class GetTaskBoardTool(BaseSituTool[SituToolDeps, GetTaskBoardResult]):
    name = "get_task_board"
    result_type = GetTaskBoardResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        project_id: str | None = None,
        **_kwargs: Any,
    ) -> GetTaskBoardResult:
        """Load agents, tasks, task dependencies, task links, and task activity."""
        repos = ctx.deps.get_repos()
        target_project_id = project_id or ctx.deps.current_project_id()
        if target_project_id is None:
            return GetTaskBoardResult(
                success=True,
                agents=[],
                tasks=[],
                task_dependencies=[],
                task_entity_links=[],
                task_activities=[],
            )
        tasks = repos.tasks.list_for_project(target_project_id)
        task_ids = {task.id for task in tasks}
        return GetTaskBoardResult(
            success=True,
            agents=[
                agent.model_dump()
                for agent in repos.agents.list_for_project(target_project_id)
            ],
            tasks=[task.model_dump() for task in tasks],
            task_dependencies=[
                dependency.model_dump()
                for dependency in repos.task_dependencies.list_for_project(
                    target_project_id
                )
                if dependency.task_id in task_ids
                or dependency.blocked_by_task_id in task_ids
            ],
            task_entity_links=[
                link.model_dump()
                for link in repos.task_entity_links.list_for_project(target_project_id)
                if link.task_id in task_ids
            ],
            task_activities=[
                activity.model_dump()
                for task_id in task_ids
                for activity in repos.task_activities.list_for_task(task_id)
            ],
        )
