from __future__ import annotations

import asyncio
from typing import Any

from pydantic import BaseModel, ConfigDict

from .agents import AgentsRepository
from .agent_message_history import AgentMessageHistoryRepository
from .analyses import AnalysesRepository
from .analysis_activities import AnalysisActivitiesRepository
from .artifacts import ArtifactsRepository
from .baselines import BaselinesRepository
from .events import EventsRepository
from .evaluation_activities import EvaluationActivitiesRepository
from .evaluations import EvaluationsRepository
from .experiment_activities import ExperimentActivitiesRepository
from .experiments import ExperimentsRepository
from .hypotheses import HypothesesRepository
from .hypothesis_activities import HypothesisActivitiesRepository
from .hypothesis_experiment_links import HypothesisExperimentLinksRepository
from .measurements import MeasurementsRepository
from .project import ProjectRepository
from .sessions import SessionsRepository
from .task_activities import TaskActivitiesRepository
from .task_dependencies import TaskDependenciesRepository
from .task_entity_links import TaskEntityLinksRepository
from .tasks import TasksRepository
from .workspaces import WorkspacesRepository


class RepositoryProxy:
    def __init__(self, repository: object) -> None:
        self._repository = repository

    def __getattr__(self, name: str) -> Any:
        value = getattr(self._repository, name)
        if not callable(value):
            return value

        async def call(*args: Any, **kwargs: Any) -> Any:
            return await asyncio.to_thread(value, *args, **kwargs)

        return call


class Repositories(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    workspaces: RepositoryProxy
    projects: RepositoryProxy
    sessions: RepositoryProxy
    agents: RepositoryProxy
    tasks: RepositoryProxy
    task_dependencies: RepositoryProxy
    task_entity_links: RepositoryProxy
    task_activities: RepositoryProxy
    analyses: RepositoryProxy
    analysis_activities: RepositoryProxy
    hypotheses: RepositoryProxy
    baselines: RepositoryProxy
    experiments: RepositoryProxy
    evaluations: RepositoryProxy
    measurements: RepositoryProxy
    hypothesis_experiment_links: RepositoryProxy
    hypothesis_activities: RepositoryProxy
    experiment_activities: RepositoryProxy
    evaluation_activities: RepositoryProxy
    artifacts: RepositoryProxy
    agent_message_history: RepositoryProxy
    events: RepositoryProxy

    @classmethod
    def create(cls, db: object) -> "Repositories":
        return cls(
            workspaces=RepositoryProxy(WorkspacesRepository(db=db)),
            projects=RepositoryProxy(ProjectRepository(db=db)),
            sessions=RepositoryProxy(SessionsRepository(db=db)),
            agents=RepositoryProxy(AgentsRepository(db=db)),
            tasks=RepositoryProxy(TasksRepository(db=db)),
            task_dependencies=RepositoryProxy(TaskDependenciesRepository(db=db)),
            task_entity_links=RepositoryProxy(TaskEntityLinksRepository(db=db)),
            task_activities=RepositoryProxy(TaskActivitiesRepository(db=db)),
            analyses=RepositoryProxy(AnalysesRepository(db=db)),
            analysis_activities=RepositoryProxy(AnalysisActivitiesRepository(db=db)),
            hypotheses=RepositoryProxy(HypothesesRepository(db=db)),
            baselines=RepositoryProxy(BaselinesRepository(db=db)),
            experiments=RepositoryProxy(ExperimentsRepository(db=db)),
            evaluations=RepositoryProxy(EvaluationsRepository(db=db)),
            measurements=RepositoryProxy(MeasurementsRepository(db=db)),
            hypothesis_experiment_links=RepositoryProxy(
                HypothesisExperimentLinksRepository(db=db),
            ),
            hypothesis_activities=RepositoryProxy(HypothesisActivitiesRepository(db=db)),
            experiment_activities=RepositoryProxy(ExperimentActivitiesRepository(db=db)),
            evaluation_activities=RepositoryProxy(EvaluationActivitiesRepository(db=db)),
            artifacts=RepositoryProxy(ArtifactsRepository(db=db)),
            agent_message_history=RepositoryProxy(AgentMessageHistoryRepository(db=db)),
            events=RepositoryProxy(EventsRepository(db=db)),
        )
