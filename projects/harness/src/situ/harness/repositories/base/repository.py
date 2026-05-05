from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...core.db import Database


class BaseRepository(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    db: Database
