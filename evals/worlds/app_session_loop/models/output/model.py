from __future__ import annotations

from typing import Any

from pydantic import Field

from evals.harness.models import SituEvalOutput


class AppSessionLoopEvalOutput(SituEvalOutput):
    session_graph: dict[str, Any] = Field(default_factory=dict)
    workspace_files: dict[str, str] = Field(default_factory=dict)
    changed_files: list[str] = Field(default_factory=list)
