from __future__ import annotations

from typing import Any

from pydantic import Field

from evals.framework.models import SituEvalOutput


class AppSessionLoopEvalOutput(SituEvalOutput):
    project_overview: dict[str, Any] = Field(default_factory=dict)
    artifact_files: dict[str, str] = Field(default_factory=dict)
    workspace_files: dict[str, str] = Field(default_factory=dict)
    changed_files: list[str] = Field(default_factory=list)

    @property
    def project_board(self) -> dict[str, Any]:
        return self.project_overview
