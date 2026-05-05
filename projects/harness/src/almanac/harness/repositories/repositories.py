from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ..core.db import Database
from .agent_message_history import AgentMessageHistoryRepository
from .events import EventsRepository
from .evidence import EvidenceRepository
from .experiments import ExperimentsRepository
from .findings import FindingsRepository
from .project_config import ProjectConfigRepository
from .runs import RunsRepository
from .warnings import WarningsRepository


class Repositories(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    project_config: ProjectConfigRepository
    runs: RunsRepository
    experiments: ExperimentsRepository
    evidence: EvidenceRepository
    findings: FindingsRepository
    warnings: WarningsRepository
    agent_message_history: AgentMessageHistoryRepository
    events: EventsRepository

    @classmethod
    def create(cls, db: Database) -> Repositories:
        return cls(
            project_config=ProjectConfigRepository(db=db),
            runs=RunsRepository(db=db),
            experiments=ExperimentsRepository(db=db),
            evidence=EvidenceRepository(db=db),
            findings=FindingsRepository(db=db),
            warnings=WarningsRepository(db=db),
            agent_message_history=AgentMessageHistoryRepository(db=db),
            events=EventsRepository(db=db),
        )
