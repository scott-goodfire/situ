from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class NextSessionIdSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    session_number: int
