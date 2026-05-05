from __future__ import annotations

from typing import Any

from pydantic import Field

from evals.harness.models import AlmanacEvalOutput


class RepoBootstrapEvalOutput(AlmanacEvalOutput):
    research_agent_output: dict[str, Any] = Field(default_factory=dict)
    session_graph: dict[str, Any] = Field(default_factory=dict)
    workspace_files: dict[str, str] = Field(default_factory=dict)
    changed_files: list[str] = Field(default_factory=list)
