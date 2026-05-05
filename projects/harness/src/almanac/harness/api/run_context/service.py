from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...repositories import Repositories
from .schemas import RunContextSchema


class RunContextService(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    repos: Repositories

    def get(self, run_id: str) -> RunContextSchema:
        return RunContextSchema(
            config=self.repos.project_config.get(),
            run=self.repos.runs.get(run_id),
            recent_experiments=self.repos.experiments.list_for_run(run_id)[-10:],
            recent_evidence=self.repos.evidence.list_for_run(run_id)[-10:],
            recent_findings=self.repos.findings.list_for_run(run_id)[-10:],
            recent_warnings=self.repos.warnings.list_for_run(run_id)[-10:],
        )
