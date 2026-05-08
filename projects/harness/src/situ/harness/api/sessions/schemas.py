from __future__ import annotations

from pydantic import BaseModel


class NextSessionIdSchema(BaseModel):
    session_id: str
    session_number: int
