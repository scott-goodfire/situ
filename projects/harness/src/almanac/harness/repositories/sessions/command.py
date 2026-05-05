from __future__ import annotations

from ...records import SessionStatus
from ..base.command import RepositoryCommand


class CreateSession(RepositoryCommand):
    session_id: str
    objective_id: str
    objective: str
    research_context: str


class UpdateSessionStatus(RepositoryCommand):
    session_id: str
    status: SessionStatus
