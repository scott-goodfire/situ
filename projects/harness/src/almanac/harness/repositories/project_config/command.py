from __future__ import annotations

from ..base.command import RepositoryCommand


class SetProjectConfig(RepositoryCommand):
    research_context: str
    associated_session_id: str | None = None
