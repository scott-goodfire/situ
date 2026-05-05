from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ..core.db import Database
from .agent_message_history import AgentMessageHistoryRepository
from .artifacts import ArtifactsRepository
from .events import EventsRepository
from .evaluation_activities import EvaluationActivitiesRepository
from .evaluations import EvaluationsRepository
from .experiment_activities import ExperimentActivitiesRepository
from .experiments import ExperimentsRepository
from .hypotheses import HypothesesRepository
from .hypothesis_activities import HypothesisActivitiesRepository
from .hypothesis_experiment_links import HypothesisExperimentLinksRepository
from .objectives import ObjectivesRepository
from .project import ProjectRepository
from .research_contexts import ResearchContextsRepository
from .sessions import SessionsRepository


class Repositories(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    project: ProjectRepository
    objectives: ObjectivesRepository
    research_contexts: ResearchContextsRepository
    sessions: SessionsRepository
    hypotheses: HypothesesRepository
    experiments: ExperimentsRepository
    evaluations: EvaluationsRepository
    hypothesis_experiment_links: HypothesisExperimentLinksRepository
    hypothesis_activities: HypothesisActivitiesRepository
    experiment_activities: ExperimentActivitiesRepository
    evaluation_activities: EvaluationActivitiesRepository
    artifacts: ArtifactsRepository
    agent_message_history: AgentMessageHistoryRepository
    events: EventsRepository

    @classmethod
    def create(cls, db: Database) -> "Repositories":
        return cls(
            project=ProjectRepository(db=db),
            objectives=ObjectivesRepository(db=db),
            research_contexts=ResearchContextsRepository(db=db),
            sessions=SessionsRepository(db=db),
            hypotheses=HypothesesRepository(db=db),
            experiments=ExperimentsRepository(db=db),
            evaluations=EvaluationsRepository(db=db),
            hypothesis_experiment_links=HypothesisExperimentLinksRepository(db=db),
            hypothesis_activities=HypothesisActivitiesRepository(db=db),
            experiment_activities=ExperimentActivitiesRepository(db=db),
            evaluation_activities=EvaluationActivitiesRepository(db=db),
            artifacts=ArtifactsRepository(db=db),
            agent_message_history=AgentMessageHistoryRepository(db=db),
            events=EventsRepository(db=db),
        )
