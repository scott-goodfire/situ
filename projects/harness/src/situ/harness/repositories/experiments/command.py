from __future__ import annotations

from ...records import WorkStatus
from ..base.command import RepositoryCommand


class CreateExperiment(RepositoryCommand):
    experiment_id: str
    project_id: str
    created_in_session_id: str | None = None
    title: str
    summary: str
    status: WorkStatus = WorkStatus.OPEN
    worktree_path: str | None = None
    base_commit: str | None = None


class UpdateExperiment(RepositoryCommand):
    experiment_id: str
    title: str | None = None
    summary: str | None = None
    status: WorkStatus | None = None
    worktree_path: str | None = None
    base_commit: str | None = None
