from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...repositories import Repositories
from .schemas import ProjectOverviewSchema
from .summary import build_board_summary


class ProjectOverviewService(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    repos: Repositories

    async def get_project_overview(self, *, session_id: str) -> ProjectOverviewSchema:
        session = await self.repos.sessions.get(session_id=session_id)
        workspace = (
            await self.repos.workspaces.get(workspace_id=session.workspace_id)
            if session is not None
            else None
        )
        project = (
            await self.repos.projects.get(project_id=session.project_id)
            if session is not None and session.project_id is not None
            else None
        )
        hypotheses = await self.repos.hypotheses.list_for_session(session_id=session_id)
        baselines = await self.repos.baselines.list_for_session(session_id=session_id)
        experiments = await self.repos.experiments.list_for_session(session_id=session_id)
        evaluations = await self.repos.evaluations.list_for_session(session_id=session_id)
        measurements = await self.repos.measurements.list_for_session(session_id=session_id)
        agents = await self.repos.agents.list_for_session(session_id=session_id)
        tasks = await self.repos.tasks.list_for_session(session_id=session_id)
        analyses = await self.repos.analyses.list_for_session(session_id=session_id)
        hypothesis_ids = {hypothesis.id for hypothesis in hypotheses}
        baseline_ids = {baseline.id for baseline in baselines}
        experiment_ids = {experiment.id for experiment in experiments}
        evaluation_ids = {evaluation.id for evaluation in evaluations}
        task_ids = {task.id for task in tasks}
        analysis_ids = {analysis.id for analysis in analyses}
        links = [
            link
            for link in await self.repos.hypothesis_experiment_links.list_all()
            if link.hypothesis_id in hypothesis_ids or link.experiment_id in experiment_ids
        ]
        hypothesis_activities = [
            activity
            for hypothesis_id in hypothesis_ids
            for activity in await self.repos.hypothesis_activities.list_for_hypothesis(
                hypothesis_id=hypothesis_id
            )
        ]
        baseline_activities = [
            activity
            for baseline_id in baseline_ids
            for activity in await self.repos.baseline_activities.list_for_baseline(
                baseline_id=baseline_id
            )
        ]
        experiment_activities = [
            activity
            for experiment_id in experiment_ids
            for activity in await self.repos.experiment_activities.list_for_experiment(
                experiment_id=experiment_id
            )
        ]
        evaluation_activities = [
            activity
            for evaluation_id in evaluation_ids
            for activity in await self.repos.evaluation_activities.list_for_evaluation(
                evaluation_id=evaluation_id
            )
        ]
        task_activities = [
            activity
            for task_id in task_ids
            for activity in await self.repos.task_activities.list_for_task(task_id=task_id)
        ]
        analysis_activities = [
            activity
            for analysis_id in analysis_ids
            for activity in await self.repos.analysis_activities.list_for_analysis(
                analysis_id=analysis_id
            )
        ]
        task_dependencies = [
            dependency
            for dependency in await self.repos.task_dependencies.list_all()
            if dependency.task_id in task_ids or dependency.blocked_by_task_id in task_ids
        ]
        task_entity_links = [
            link
            for link in await self.repos.task_entity_links.list_all()
            if link.task_id in task_ids
        ]
        artifacts = await self.repos.artifacts.list_for_session(session_id=session_id)
        events = await self.repos.events.list_for_session(session_id=session_id)
        return ProjectOverviewSchema(
            summary=build_board_summary(
                project=project,
                session=session,
                tasks=tasks,
                task_dependencies=task_dependencies,
                analyses=analyses,
                hypotheses=hypotheses,
                baselines=baselines,
                experiments=experiments,
                evaluations=evaluations,
                measurements=measurements,
                artifacts=artifacts,
                events=events,
            ),
            workspace=workspace,
            project=project,
            session=session,
            hypotheses=hypotheses,
            baselines=baselines,
            experiments=experiments,
            evaluations=evaluations,
            measurements=measurements,
            hypothesis_experiment_links=links,
            agents=agents,
            tasks=tasks,
            task_dependencies=task_dependencies,
            task_entity_links=task_entity_links,
            task_activities=task_activities,
            analyses=analyses,
            analysis_activities=analysis_activities,
            hypothesis_activities=hypothesis_activities,
            baseline_activities=baseline_activities,
            experiment_activities=experiment_activities,
            evaluation_activities=evaluation_activities,
            artifacts=artifacts,
            events=events,
            compute_targets=await self.repos.compute_targets.list_all(),
        )
