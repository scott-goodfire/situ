from __future__ import annotations

from ...records import SessionStatus
from ..base.command import RepositoryCommand


class CreateSession(RepositoryCommand):
    session_id: str
    project_id: str


class UpdateSessionStatus(RepositoryCommand):
    session_id: str
    status: SessionStatus
