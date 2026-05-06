from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...repositories import Repositories
from .schemas import NextSessionIdSchema, SessionGraphSchema


class SessionsService(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    repos: Repositories

    def current_session_count(self) -> int:
        return len(self.repos.sessions.list_all())

    def next_session_id(self) -> NextSessionIdSchema:
        session_number = self.current_session_count() + 1
        return NextSessionIdSchema(
            session_id=f"session_{session_number:04d}",
            session_number=session_number,
        )

    def get_session(self, session_id: str) -> SessionGraphSchema:
        session = self.repos.sessions.get(session_id)
        workspace = (
            self.repos.workspaces.get(session.workspace_id)
            if session is not None
            else None
        )
        project = (
            self.repos.projects.get(session.project_id)
            if session is not None and session.project_id is not None
            else None
        )
        hypotheses = self.repos.hypotheses.list_for_session(session_id)
        experiments = self.repos.experiments.list_for_session(session_id)
        evaluations = self.repos.evaluations.list_for_session(session_id)
        agents = self.repos.agents.list_for_session(session_id)
        tasks = self.repos.tasks.list_for_session(session_id)
        hypothesis_ids = {hypothesis.id for hypothesis in hypotheses}
        experiment_ids = {experiment.id for experiment in experiments}
        evaluation_ids = {evaluation.id for evaluation in evaluations}
        task_ids = {task.id for task in tasks}
        links = [
            link
            for link in self.repos.hypothesis_experiment_links.list_all()
            if link.hypothesis_id in hypothesis_ids or link.experiment_id in experiment_ids
        ]
        hypothesis_activities = [
            activity
            for hypothesis_id in hypothesis_ids
            for activity in self.repos.hypothesis_activities.list_for_hypothesis(
                hypothesis_id
            )
        ]
        experiment_activities = [
            activity
            for experiment_id in experiment_ids
            for activity in self.repos.experiment_activities.list_for_experiment(
                experiment_id
            )
        ]
        evaluation_activities = [
            activity
            for evaluation_id in evaluation_ids
            for activity in self.repos.evaluation_activities.list_for_evaluation(
                evaluation_id
            )
        ]
        task_activities = [
            activity
            for task_id in task_ids
            for activity in self.repos.task_activities.list_for_task(task_id)
        ]
        task_dependencies = [
            dependency
            for dependency in self.repos.task_dependencies.list_all()
            if dependency.task_id in task_ids or dependency.blocked_by_task_id in task_ids
        ]
        task_entity_links = [
            link
            for link in self.repos.task_entity_links.list_all()
            if link.task_id in task_ids
        ]
        return SessionGraphSchema(
            workspace=workspace,
            project=project,
            session=session,
            hypotheses=hypotheses,
            experiments=experiments,
            evaluations=evaluations,
            hypothesis_experiment_links=links,
            agents=agents,
            tasks=tasks,
            task_dependencies=task_dependencies,
            task_entity_links=task_entity_links,
            task_activities=task_activities,
            hypothesis_activities=hypothesis_activities,
            experiment_activities=experiment_activities,
            evaluation_activities=evaluation_activities,
            artifacts=self.repos.artifacts.list_for_session(session_id),
            events=self.repos.events.list_for_session(session_id),
        )
