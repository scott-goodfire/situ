from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class NextRunIdSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run_id: str
    run_number: int
