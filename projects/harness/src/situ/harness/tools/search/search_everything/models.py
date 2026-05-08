from __future__ import annotations

from typing import Any

from pydantic import Field

from ...common import SituToolReturn


class SearchEverythingResult(SituToolReturn):
    analyses: list[dict[str, Any]] = Field(default_factory=list)
    hypotheses: list[dict[str, Any]] = Field(default_factory=list)
    experiments: list[dict[str, Any]] = Field(default_factory=list)
    baselines: list[dict[str, Any]] = Field(default_factory=list)
    evaluations: list[dict[str, Any]] = Field(default_factory=list)
    measurements: list[dict[str, Any]] = Field(default_factory=list)
    tasks: list[dict[str, Any]] = Field(default_factory=list)
    activities: list[dict[str, Any]] = Field(default_factory=list)
    total_hits: int = 0
