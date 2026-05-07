from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...records import EventRecord
from ...records.base import DbRecord
from ...repositories import Repositories
from .schemas import CollectionsBootstrapSchema


class CollectionsService(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    repos: Repositories

    def bootstrap(self, *, workspace_id: str | None = None) -> CollectionsBootstrapSchema:
        workspace = self.repos.workspaces.get(workspace_id=workspace_id)
        projects = (
            self.repos.projects.list_for_workspace(workspace_id=workspace.id)
            if workspace is not None
            else self.repos.projects.list_all()
        )
        project_ids = {project.id for project in projects}
        sessions = (
            self.repos.sessions.list_for_workspace(workspace_id=workspace.id)
            if workspace is not None
            else self.repos.sessions.list_all()
        )
        session_ids = {session.id for session in sessions}

        hypotheses = self._filter_project_records(
            self.repos.hypotheses.list_all(),
            project_ids,
        )
        baselines = self._filter_project_records(
            self.repos.baselines.list_all(),
            project_ids,
        )
        experiments = self._filter_project_records(
            self.repos.experiments.list_all(),
            project_ids,
        )
        evaluations = self._filter_project_records(
            self.repos.evaluations.list_all(),
            project_ids,
        )
        analyses = self._filter_project_records(
            self.repos.analyses.list_all(),
            project_ids,
        )
        hypothesis_ids = {hypothesis.id for hypothesis in hypotheses}
        baseline_ids = {baseline.id for baseline in baselines}
        experiment_ids = {experiment.id for experiment in experiments}
        evaluation_ids = {evaluation.id for evaluation in evaluations}
        analysis_ids = {analysis.id for analysis in analyses}
        agents = self._filter_project_records(self.repos.agents.list_all(), project_ids)
        tasks = self._filter_project_records(self.repos.tasks.list_all(), project_ids)
        task_ids = {task.id for task in tasks}
        events = [
            event
            for event in self.repos.events.list_all()
            if event.associated_project_id in project_ids
            or event.associated_session_id in session_ids
            or (
                event.associated_project_id is None
                and event.associated_session_id is None
            )
        ]
        return CollectionsBootstrapSchema(
            cursor=self.cursor(events),
            workspaces=[workspace] if workspace is not None else [],
            projects=projects,
            sessions=sessions,
            hypotheses=hypotheses,
            baselines=baselines,
            experiments=experiments,
            evaluations=evaluations,
            measurements=[
                measurement
                for measurement in self.repos.measurements.list_all()
                if measurement.evaluation_id in evaluation_ids
                or measurement.created_in_session_id in session_ids
            ],
            hypothesis_experiment_links=[
                link
                for link in self.repos.hypothesis_experiment_links.list_all()
                if link.hypothesis_id in hypothesis_ids
                or link.experiment_id in experiment_ids
            ],
            agents=agents,
            tasks=tasks,
            task_dependencies=[
                dependency
                for dependency in self.repos.task_dependencies.list_all()
                if dependency.project_id in project_ids
                or dependency.task_id in task_ids
                or dependency.blocked_by_task_id in task_ids
            ],
            task_entity_links=[
                link
                for link in self.repos.task_entity_links.list_all()
                if link.project_id in project_ids or link.task_id in task_ids
            ],
            task_activities=[
                activity
                for activity in self.repos.task_activities.list_all()
                if activity.project_id in project_ids
                or activity.task_id in task_ids
                or activity.created_in_session_id in session_ids
            ],
            analyses=analyses,
            analysis_activities=[
                activity
                for activity in self.repos.analysis_activities.list_all()
                if activity.analysis_id in analysis_ids
                or activity.created_in_session_id in session_ids
            ],
            hypothesis_activities=[
                activity
                for activity in self.repos.hypothesis_activities.list_all()
                if activity.hypothesis_id in hypothesis_ids
                or activity.created_in_session_id in session_ids
            ],
            experiment_activities=[
                activity
                for activity in self.repos.experiment_activities.list_all()
                if activity.experiment_id in experiment_ids
                or activity.created_in_session_id in session_ids
            ],
            evaluation_activities=[
                activity
                for activity in self.repos.evaluation_activities.list_all()
                if activity.evaluation_id in evaluation_ids
                or activity.created_in_session_id in session_ids
            ],
            artifacts=[
                artifact
                for artifact in self.repos.artifacts.list_all()
                if artifact.project_id in project_ids
                or artifact.created_in_session_id in session_ids
                or artifact.associated_entity_id
                in (
                    hypothesis_ids
                    | baseline_ids
                    | experiment_ids
                    | evaluation_ids
                    | analysis_ids
                    | task_ids
                )
            ],
            events=events,
        )

    def current_cursor(self, *, workspace_id: str | None = None) -> int:
        return self.cursor(self.bootstrap(workspace_id=workspace_id).events)

    @staticmethod
    def cursor(events: list[EventRecord]) -> int:
        return events[-1].id if events else 0

    @staticmethod
    def _filter_project_records(
        records: list[DbRecord],
        project_ids: set[str],
    ) -> list:
        if not project_ids:
            return []
        return [
            record
            for record in records
            if getattr(record, "project_id", None) in project_ids
        ]
