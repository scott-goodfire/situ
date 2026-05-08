from __future__ import annotations

from typing import Any

from pydantic import Field

from ...common import SituToolReturn


class GetTaskOverviewResult(SituToolReturn):
    summary: dict[str, Any] = Field(default_factory=dict)
    agents: list[dict[str, Any]] = Field(default_factory=list)
    tasks: list[dict[str, Any]] = Field(default_factory=list)
    task_dependencies: list[dict[str, Any]] = Field(default_factory=list)
    task_entity_links: list[dict[str, Any]] = Field(default_factory=list)
    task_activities: list[dict[str, Any]] = Field(default_factory=list)
