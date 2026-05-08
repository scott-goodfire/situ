from __future__ import annotations

from typing import Any

from pydantic import Field

from ...common import SituToolReturn


class GetTaskResult(SituToolReturn):
    task: dict[str, Any] | None = None
    parent_task: dict[str, Any] | None = None
    child_tasks: list[dict[str, Any]] = Field(default_factory=list)
    task_dependencies: list[dict[str, Any]] = Field(default_factory=list)
    task_entity_links: list[dict[str, Any]] = Field(default_factory=list)
    task_activities: list[dict[str, Any]] = Field(default_factory=list)
