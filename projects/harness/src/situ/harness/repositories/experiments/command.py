from __future__ import annotations

from ...records import RecordStatus
from ..base.command import RepositoryCommand


class CreateExperiment(RepositoryCommand):
    experiment_id: str
    project_id: str
    created_in_session_id: str | None = None
    title: str
    summary: str
    status: RecordStatus = RecordStatus.TRIAGE
    worktree_path: str | None = None
    base_commit: str | None = None
    candidate_commit: str | None = None
    parent_experiment_id: str | None = None
    research_thread: str | None = None


class UpdateExperiment(RepositoryCommand):
    experiment_id: str
    title: str | None = None
    summary: str | None = None
    status: RecordStatus | None = None
    worktree_path: str | None = None
    base_commit: str | None = None
    candidate_commit: str | None = None
    parent_experiment_id: str | None = None
    research_thread: str | None = None
