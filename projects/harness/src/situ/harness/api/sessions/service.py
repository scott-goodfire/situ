from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...repositories import Repositories
from .schemas import NextSessionIdSchema


class SessionsService(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    repos: Repositories

    def current_session_count(self) -> int:
        return len(self.repos.sessions.list_all())

    def next_session_id(self) -> NextSessionIdSchema:
        session_number = self.current_session_count() + 1
        return NextSessionIdSchema(
            session_id=f"session_{session_number:04d}",
            session_number=session_number,
        )
