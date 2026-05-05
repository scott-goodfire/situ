from __future__ import annotations

from typing import Any

from pydantic import Field

from ...common import AlmanacToolReturn


class GetSessionResult(AlmanacToolReturn):
    config: dict[str, Any] | None = None
    session: dict[str, Any] | None = None
    objective: dict[str, Any] | None = None
    hypotheses: list[dict[str, Any]] = Field(default_factory=list)
    experiments: list[dict[str, Any]] = Field(default_factory=list)
    hypothesis_experiment_links: list[dict[str, Any]] = Field(default_factory=list)
    hypothesis_activities: list[dict[str, Any]] = Field(default_factory=list)
    experiment_activities: list[dict[str, Any]] = Field(default_factory=list)
    artifacts: list[dict[str, Any]] = Field(default_factory=list)
    events: list[dict[str, Any]] = Field(default_factory=list)
