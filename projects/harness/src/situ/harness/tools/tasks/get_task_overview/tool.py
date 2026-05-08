from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import GetTaskOverviewResult


class GetTaskOverviewTool(BaseSituTool[SituToolDeps, GetTaskOverviewResult]):
    name = "get_task_overview"
    result_type = GetTaskOverviewResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        project_id: str | None = None,
        **_kwargs: Any,
    ) -> GetTaskOverviewResult:
        """
        Load the task-coordination slice: agents, tasks, task dependencies, task
        entity links, and task activity.

        Lighter than `get_project_overview` — prefer this when you only need
        coordination state and not the research record. Use `get_project_overview`
        when you also need analyses, hypotheses, baselines, experiments,
        evaluations, measurements, or artifacts.
        """
        repos = await ctx.deps.get_repos()
        target_project_id = project_id or await ctx.deps.current_project_id()
        if target_project_id is None:
            return GetTaskOverviewResult(
                success=True,
                agents=[],
                tasks=[],
                task_dependencies=[],
                task_entity_links=[],
                task_activities=[],
            )
        tasks = await repos.tasks.list_for_project(project_id=target_project_id)
        task_ids = {task.id for task in tasks}
        return GetTaskOverviewResult(
            success=True,
            agents=[
                agent.model_dump()
                for agent in await repos.agents.list_for_project(project_id=target_project_id)
            ],
            tasks=[task.model_dump() for task in tasks],
            task_dependencies=[
                dependency.model_dump()
                for dependency in await repos.task_dependencies.list_for_project(
                    project_id=target_project_id
                )
                if dependency.task_id in task_ids
                or dependency.blocked_by_task_id in task_ids
            ],
            task_entity_links=[
                link.model_dump()
                for link in await repos.task_entity_links.list_for_project(
                    project_id=target_project_id
                )
                if link.task_id in task_ids
            ],
            task_activities=[
                activity.model_dump()
                for task_id in task_ids
                for activity in await repos.task_activities.list_for_task(task_id=task_id)
            ],
        )
