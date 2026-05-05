from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...repositories import Repositories
from .schemas import NextRunIdSchema


class RunsService(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    repos: Repositories

    def current_run_count(self) -> int:
        return len(self.repos.runs.list_all())

    def next_run_id(self) -> NextRunIdSchema:
        run_number = self.current_run_count() + 1
        return NextRunIdSchema(run_id=f"run_{run_number:04d}", run_number=run_number)
