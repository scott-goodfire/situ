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
        objective = (
            self.repos.objectives.get(session.objective_id)
            if session is not None
            else None
        )
        hypotheses = self.repos.hypotheses.list_for_session(session_id)
        experiments = self.repos.experiments.list_for_session(session_id)
        evaluations = self.repos.evaluations.list_for_session(session_id)
        hypothesis_ids = {hypothesis.id for hypothesis in hypotheses}
        experiment_ids = {experiment.id for experiment in experiments}
        links = [
            link
            for link in self.repos.hypothesis_experiment_links.list_all()
            if link.hypothesis_id in hypothesis_ids or link.experiment_id in experiment_ids
        ]
        return SessionGraphSchema(
            config=self.repos.project_config.get(),
            session=session,
            objective=objective,
            hypotheses=hypotheses,
            experiments=experiments,
            evaluations=evaluations,
            hypothesis_experiment_links=links,
            hypothesis_activities=self.repos.hypothesis_activities.list_for_session(
                session_id
            ),
            experiment_activities=self.repos.experiment_activities.list_for_session(
                session_id
            ),
            evaluation_activities=self.repos.evaluation_activities.list_for_session(
                session_id
            ),
            artifacts=self.repos.artifacts.list_for_session(session_id),
            events=self.repos.events.list_for_session(session_id),
        )
