from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from .database import Database
from .repos.events import EventsRepository
from .repos.evidence import EvidenceRepository
from .repos.experiments import ExperimentsRepository
from .repos.findings import FindingsRepository
from .repos.project_config import ProjectConfigRepository
from .repos.runs import RunsRepository
from .repos.snapshots import SnapshotsRepository
from .repos.warnings import WarningsRepository


class Repositories(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    project_config: ProjectConfigRepository
    runs: RunsRepository
    experiments: ExperimentsRepository
    evidence: EvidenceRepository
    findings: FindingsRepository
    warnings: WarningsRepository
    events: EventsRepository
    snapshots: SnapshotsRepository

    @classmethod
    def create(cls, db: Database) -> Repositories:
        return cls(
            project_config=ProjectConfigRepository(db=db),
            runs=RunsRepository(db=db),
            experiments=ExperimentsRepository(db=db),
            evidence=EvidenceRepository(db=db),
            findings=FindingsRepository(db=db),
            warnings=WarningsRepository(db=db),
            events=EventsRepository(db=db),
            snapshots=SnapshotsRepository(db=db),
        )
