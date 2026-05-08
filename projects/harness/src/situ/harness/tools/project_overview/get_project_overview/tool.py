from __future__ import annotations

import os

from pydantic_ai import RunContext

from ....api.project_overview import ProjectOverviewService
from ...common import SituToolDeps, BaseSituTool
from .models import GetProjectOverviewResult


def _resolve_cap(env_var: str, default: int) -> int:
    raw = os.environ.get(env_var)
    if raw is None:
        return default
    try:
        return max(1, int(raw))
    except ValueError:
        return default


def _tail(items, cap: int) -> list:
    if len(items) <= cap:
        return items
    return items[-cap:]


class GetProjectOverviewTool(BaseSituTool[SituToolDeps, GetProjectOverviewResult]):
    name = "get_project_overview"
    result_type = GetProjectOverviewResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
    ) -> GetProjectOverviewResult:
        """
        Load the current project's bundled state: project, analyses, hypotheses,
        baselines, experiments, evaluations, measurements, links, activities,
        artifacts, agents, tasks, and events.

        This is the broadest read. For long-running sessions where activity and
        event lists grow large, this tool returns only the most recent items in
        those lists. Prefer `get_task_overview` when you only need coordination
        state (agents, tasks, dependencies, links, task activity); use focused
        `list_*` and `get_*` tools (e.g. `list_measurements`,
        `list_evaluation_activities`, `get_task`) for older or filtered slices.
        """
        events_cap = _resolve_cap("SITU_OVERVIEW_EVENTS_CAP", 60)
        activities_cap = _resolve_cap("SITU_OVERVIEW_ACTIVITIES_CAP", 40)

        overview = await ProjectOverviewService(
            repos=await ctx.deps.get_repos()
        ).get_project_overview(
            session_id=ctx.deps.session_id
        )
        return GetProjectOverviewResult(
            success=True,
            workspace=overview.workspace.model_dump() if overview.workspace is not None else None,
            project=overview.project.model_dump() if overview.project is not None else None,
            hypotheses=[hypothesis.model_dump() for hypothesis in overview.hypotheses],
            baselines=[baseline.model_dump() for baseline in overview.baselines],
            experiments=[experiment.model_dump() for experiment in overview.experiments],
            evaluations=[evaluation.model_dump() for evaluation in overview.evaluations],
            measurements=[
                measurement.model_dump() for measurement in overview.measurements
            ],
            hypothesis_experiment_links=[
                link.model_dump() for link in overview.hypothesis_experiment_links
            ],
            agents=[agent.model_dump() for agent in overview.agents],
            tasks=[task.model_dump() for task in overview.tasks],
            task_dependencies=[
                dependency.model_dump() for dependency in overview.task_dependencies
            ],
            task_entity_links=[link.model_dump() for link in overview.task_entity_links],
            task_activities=[
                activity.model_dump()
                for activity in _tail(overview.task_activities, activities_cap)
            ],
            analyses=[analysis.model_dump() for analysis in overview.analyses],
            analysis_activities=[
                activity.model_dump()
                for activity in _tail(overview.analysis_activities, activities_cap)
            ],
            hypothesis_activities=[
                activity.model_dump()
                for activity in _tail(overview.hypothesis_activities, activities_cap)
            ],
            experiment_activities=[
                activity.model_dump()
                for activity in _tail(overview.experiment_activities, activities_cap)
            ],
            evaluation_activities=[
                activity.model_dump()
                for activity in _tail(overview.evaluation_activities, activities_cap)
            ],
            artifacts=[artifact.model_dump() for artifact in overview.artifacts],
            events=[event.model_dump() for event in _tail(overview.events, events_cap)],
        )
