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
            runs=self.repos.runs.list_all(),
            experiments=self.repos.experiments.list_all(),
            evidence=self.repos.evidence.list_all(),
            findings=self.repos.findings.list_all(),
            warnings=self.repos.warnings.list_all(),
            events=self.repos.events.list_all(),
        )
