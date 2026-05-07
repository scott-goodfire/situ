from __future__ import annotations

from typing import Any

from pydantic import Field

from ...common import SituToolReturn


class GetProjectBoardResult(SituToolReturn):
    workspace: dict[str, Any] | None = None
    project: dict[str, Any] | None = None
    hypotheses: list[dict[str, Any]] = Field(default_factory=list)
    baselines: list[dict[str, Any]] = Field(default_factory=list)
    experiments: list[dict[str, Any]] = Field(default_factory=list)
    evaluations: list[dict[str, Any]] = Field(default_factory=list)
    measurements: list[dict[str, Any]] = Field(default_factory=list)
    hypothesis_experiment_links: list[dict[str, Any]] = Field(default_factory=list)
    agents: list[dict[str, Any]] = Field(default_factory=list)
    tasks: list[dict[str, Any]] = Field(default_factory=list)
    task_dependencies: list[dict[str, Any]] = Field(default_factory=list)
    task_entity_links: list[dict[str, Any]] = Field(default_factory=list)
    task_activities: list[dict[str, Any]] = Field(default_factory=list)
    analyses: list[dict[str, Any]] = Field(default_factory=list)
    analysis_activities: list[dict[str, Any]] = Field(default_factory=list)
    hypothesis_activities: list[dict[str, Any]] = Field(default_factory=list)
    experiment_activities: list[dict[str, Any]] = Field(default_factory=list)
    evaluation_activities: list[dict[str, Any]] = Field(default_factory=list)
    artifacts: list[dict[str, Any]] = Field(default_factory=list)
    events: list[dict[str, Any]] = Field(default_factory=list)
