from __future__ import annotations

from pydantic import BaseModel, Field

from ...common import SituToolReturn


class ComputePoolSummary(BaseModel):
    pool: str
    idle: int
    claimed: int
    draining: int
    total: int


class ComputePoolsOverviewResult(SituToolReturn):
    pools: list[ComputePoolSummary] = Field(default_factory=list)
