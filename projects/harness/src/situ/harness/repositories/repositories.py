from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ..core.db import Database
from .agents import AgentsRepository
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
from .project import ProjectRepository
from .sessions import SessionsRepository
from .task_activities import TaskActivitiesRepository
from .task_dependencies import TaskDependenciesRepository
from .task_entity_links import TaskEntityLinksRepository
from .tasks import TasksRepository
from .workspaces import WorkspacesRepository


class Repositories(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    workspaces: WorkspacesRepository
    projects: ProjectRepository
    sessions: SessionsRepository
    agents: AgentsRepository
    tasks: TasksRepository
    task_dependencies: TaskDependenciesRepository
    task_entity_links: TaskEntityLinksRepository
    task_activities: TaskActivitiesRepository
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
            workspaces=WorkspacesRepository(db=db),
            projects=ProjectRepository(db=db),
            sessions=SessionsRepository(db=db),
            agents=AgentsRepository(db=db),
            tasks=TasksRepository(db=db),
            task_dependencies=TaskDependenciesRepository(db=db),
            task_entity_links=TaskEntityLinksRepository(db=db),
            task_activities=TaskActivitiesRepository(db=db),
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
