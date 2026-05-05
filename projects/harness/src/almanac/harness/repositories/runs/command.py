from __future__ import annotations

from ..base.command import RepositoryCommand


class CreateRun(RepositoryCommand):
    run_id: str


class UpdateRunStatus(RepositoryCommand):
    run_id: str
    status: str
