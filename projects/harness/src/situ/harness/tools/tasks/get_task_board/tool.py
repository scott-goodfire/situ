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
        session_id: str | None = None,
        **_kwargs: Any,
    ) -> GetTaskBoardResult:
        """Load agents, tasks, task dependencies, task links, and task activity."""
        repos = ctx.deps.get_repos()
        target_session_id = session_id or ctx.deps.session_id
        tasks = repos.tasks.list_for_session(target_session_id)
        task_ids = {task.id for task in tasks}
        return GetTaskBoardResult(
            success=True,
            agents=[
                agent.model_dump()
                for agent in repos.agents.list_for_session(target_session_id)
            ],
            tasks=[task.model_dump() for task in tasks],
            task_dependencies=[
                dependency.model_dump()
                for dependency in repos.task_dependencies.list_all()
                if dependency.task_id in task_ids
                or dependency.blocked_by_task_id in task_ids
            ],
            task_entity_links=[
                link.model_dump()
                for link in repos.task_entity_links.list_all()
                if link.task_id in task_ids
            ],
            task_activities=[
                activity.model_dump()
                for task_id in task_ids
                for activity in repos.task_activities.list_for_task(task_id)
            ],
        )
