from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ..core.db import Database
from .agent_message_history import AgentMessageHistoryRepository
from .artifacts import ArtifactsRepository
from .events import EventsRepository
from .experiment_activities import ExperimentActivitiesRepository
from .experiments import ExperimentsRepository
from .hypotheses import HypothesesRepository
from .hypothesis_activities import HypothesisActivitiesRepository
from .hypothesis_experiment_links import HypothesisExperimentLinksRepository
from .objectives import ObjectivesRepository
from .project_config import ProjectConfigRepository
from .sessions import SessionsRepository


class Repositories(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    project_config: ProjectConfigRepository
    objectives: ObjectivesRepository
    sessions: SessionsRepository
    hypotheses: HypothesesRepository
    experiments: ExperimentsRepository
    hypothesis_experiment_links: HypothesisExperimentLinksRepository
    hypothesis_activities: HypothesisActivitiesRepository
    experiment_activities: ExperimentActivitiesRepository
    artifacts: ArtifactsRepository
    agent_message_history: AgentMessageHistoryRepository
    events: EventsRepository

    @classmethod
    def create(cls, db: Database) -> Repositories:
        return cls(
            project_config=ProjectConfigRepository(db=db),
            objectives=ObjectivesRepository(db=db),
            sessions=SessionsRepository(db=db),
            hypotheses=HypothesesRepository(db=db),
            experiments=ExperimentsRepository(db=db),
            hypothesis_experiment_links=HypothesisExperimentLinksRepository(db=db),
            hypothesis_activities=HypothesisActivitiesRepository(db=db),
            experiment_activities=ExperimentActivitiesRepository(db=db),
            artifacts=ArtifactsRepository(db=db),
            agent_message_history=AgentMessageHistoryRepository(db=db),
            events=EventsRepository(db=db),
        )
