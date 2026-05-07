from __future__ import annotations

from typing import Any

from pydantic import Field

from evals.framework.models import SituEvalOutput


class RepoBootstrapEvalOutput(SituEvalOutput):
    research_agent_output: dict[str, Any] = Field(default_factory=dict)
    project_board: dict[str, Any] = Field(default_factory=dict)
    workspace_files: dict[str, str] = Field(default_factory=dict)
    changed_files: list[str] = Field(default_factory=list)
