from __future__ import annotations

from pydantic_ai import RunContext

from ....api.project_board import ProjectBoardService
from ...common import SituToolDeps, BaseSituTool
from .models import GetProjectBoardResult


class GetProjectBoardTool(BaseSituTool[SituToolDeps, GetProjectBoardResult]):
    name = "get_project_board"
    result_type = GetProjectBoardResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
    ) -> GetProjectBoardResult:
        """
        Load the current project board: project, analyses, hypotheses,
        baselines, experiments, evaluations, measurements, links, activities,
        artifacts, agents, tasks, and events.
        """
        board = ProjectBoardService(repos=ctx.deps.get_repos()).get_project_board(
            ctx.deps.session_id
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
            task_activities=[activity.model_dump() for activity in board.task_activities],
            analyses=[analysis.model_dump() for analysis in board.analyses],
            analysis_activities=[
                activity.model_dump() for activity in board.analysis_activities
            ],
            hypothesis_activities=[
                activity.model_dump() for activity in board.hypothesis_activities
            ],
            experiment_activities=[
                activity.model_dump() for activity in board.experiment_activities
            ],
            evaluation_activities=[
                activity.model_dump() for activity in board.evaluation_activities
            ],
            artifacts=[artifact.model_dump() for artifact in board.artifacts],
            events=[event.model_dump() for event in board.events],
        )
