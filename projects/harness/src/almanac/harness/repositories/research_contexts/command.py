from __future__ import annotations

from ..base.command import RepositoryCommand


class CreateResearchContext(RepositoryCommand):
    research_context_id: str
    session_id: str
    body: str


class UpdateResearchContext(RepositoryCommand):
    research_context_id: str
    body: str | None = None
