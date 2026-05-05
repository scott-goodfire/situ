from __future__ import annotations

from typing import Any

from pydantic import Field

from ..common import AlmanacToolReturn


class GetAgentContextResult(AlmanacToolReturn):
    config: dict[str, Any] | None = None
    objective: dict[str, Any] | None = None
    session: dict[str, Any] | None = None
    active_hypotheses: list[dict[str, Any]] = Field(default_factory=list)
    recent_experiments: list[dict[str, Any]] = Field(default_factory=list)
    hypothesis_experiment_links: list[dict[str, Any]] = Field(default_factory=list)
    recent_hypothesis_activities: list[dict[str, Any]] = Field(default_factory=list)
    recent_experiment_activities: list[dict[str, Any]] = Field(default_factory=list)
    recent_artifacts: list[dict[str, Any]] = Field(default_factory=list)
    recent_events: list[dict[str, Any]] = Field(default_factory=list)
