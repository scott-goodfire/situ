from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...repositories import Repositories
from .schemas import AgentContextSchema


class AgentContextService(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    repos: Repositories

    def get(self, session_id: str) -> AgentContextSchema:
        session = self.repos.sessions.get(session_id)
        objective = self.repos.objectives.get(session.objective_id) if session is not None else None
        objective_id = objective.id if objective is not None else None
        hypotheses = (
            self.repos.hypotheses.list_for_objective(objective_id) if objective_id is not None else []
        )
        active_hypotheses = [
            hypothesis for hypothesis in hypotheses if hypothesis.status in {"open", "active"}
        ]
        recent_experiments = self.repos.experiments.list_for_session(session_id)[-10:]
        recent_experiment_ids = {experiment.id for experiment in recent_experiments}
        hypothesis_links = [
            link
            for link in self.repos.hypothesis_experiment_links.list_all()
            if link.experiment_id in recent_experiment_ids
            or link.hypothesis_id in {hypothesis.id for hypothesis in active_hypotheses}
        ]
        return AgentContextSchema(
            config=self.repos.project_config.get(),
            objective=objective,
            session=session,
            active_hypotheses=active_hypotheses[-10:],
            recent_experiments=recent_experiments,
            hypothesis_experiment_links=hypothesis_links[-20:],
            recent_hypothesis_activities=self.repos.hypothesis_activities.list_for_session(session_id)[-20:],
            recent_experiment_activities=self.repos.experiment_activities.list_for_session(session_id)[-20:],
            recent_artifacts=self.repos.artifacts.list_for_session(session_id)[-10:],
            recent_events=self.repos.events.list_for_session(session_id)[-20:],
        )
