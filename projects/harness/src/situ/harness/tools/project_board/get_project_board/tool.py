from __future__ import annotations

import os

from pydantic_ai import RunContext

from ....api.project_board import ProjectBoardService
from ...common import SituToolDeps, BaseSituTool
from .models import GetProjectBoardResult


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


class GetProjectBoardTool(BaseSituTool[SituToolDeps, GetProjectBoardResult]):
    name = "get_project_board"
    result_type = GetProjectBoardResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
    ) -> GetProjectBoardResult:
        """
        Load the current project board: project, analyses, hypotheses,
        baselines, experiments, evaluations, measurements, links, activities,
        artifacts, agents, tasks, and events.

        For long-running sessions where activity and event lists grow large,
        this tool returns only the most recent items in those lists. Use
        focused list_* and get_* tools (e.g. list_measurements,
        list_evaluation_activities, get_task) for older or filtered slices.
        """
        events_cap = _resolve_cap("SITU_BOARD_EVENTS_CAP", 60)
        activities_cap = _resolve_cap("SITU_BOARD_ACTIVITIES_CAP", 40)

        board = await ProjectBoardService(
            repos=await ctx.deps.get_repos()
        ).get_project_board(
            session_id=ctx.deps.session_id
        )
        return GetProjectBoardResult(
            success=True,
            workspace=board.workspace.model_dump() if board.workspace is not None else None,
            project=board.project.model_dump() if board.project is not None else None,
            hypotheses=[hypothesis.model_dump() for hypothesis in board.hypotheses],
            baselines=[baseline.model_dump() for baseline in board.baselines],
            experiments=[experiment.model_dump() for experiment in board.experiments],
            evaluations=[evaluation.model_dump() for evaluation in board.evaluations],
            measurements=[
                measurement.model_dump() for measurement in board.measurements
            ],
            hypothesis_experiment_links=[
                link.model_dump() for link in board.hypothesis_experiment_links
            ],
            agents=[agent.model_dump() for agent in board.agents],
            tasks=[task.model_dump() for task in board.tasks],
            task_dependencies=[
                dependency.model_dump() for dependency in board.task_dependencies
            ],
            task_entity_links=[link.model_dump() for link in board.task_entity_links],
            task_activities=[
                activity.model_dump()
                for activity in _tail(board.task_activities, activities_cap)
            ],
            analyses=[analysis.model_dump() for analysis in board.analyses],
            analysis_activities=[
                activity.model_dump()
                for activity in _tail(board.analysis_activities, activities_cap)
            ],
            hypothesis_activities=[
                activity.model_dump()
                for activity in _tail(board.hypothesis_activities, activities_cap)
            ],
            experiment_activities=[
                activity.model_dump()
                for activity in _tail(board.experiment_activities, activities_cap)
            ],
            evaluation_activities=[
                activity.model_dump()
                for activity in _tail(board.evaluation_activities, activities_cap)
            ],
            artifacts=[artifact.model_dump() for artifact in board.artifacts],
            events=[event.model_dump() for event in _tail(board.events, events_cap)],
        )
