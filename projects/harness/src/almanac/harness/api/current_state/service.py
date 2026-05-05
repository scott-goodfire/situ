from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...repositories import Repositories
from .schemas import CurrentStateSchema


class CurrentStateService(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    repos: Repositories

    def get(self) -> CurrentStateSchema:
        return CurrentStateSchema(
            config=self.repos.project_config.get(),
            objectives=self.repos.objectives.list_all(),
            sessions=self.repos.sessions.list_all(),
            hypotheses=self.repos.hypotheses.list_all(),
            experiments=self.repos.experiments.list_all(),
            evaluations=self.repos.evaluations.list_all(),
            hypothesis_experiment_links=self.repos.hypothesis_experiment_links.list_all(),
            hypothesis_activities=self.repos.hypothesis_activities.list_all(),
            experiment_activities=self.repos.experiment_activities.list_all(),
            evaluation_activities=self.repos.evaluation_activities.list_all(),
            artifacts=self.repos.artifacts.list_all(),
            events=self.repos.events.list_all(),
        )
