from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ..database import Database


class BaseRepository(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    db: Database
