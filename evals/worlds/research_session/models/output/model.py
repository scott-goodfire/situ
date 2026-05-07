from __future__ import annotations

from typing import Any

from pydantic import Field

from evals.framework.models import SituEvalOutput


class ResearchToolEvalOutput(SituEvalOutput):
    project_board: dict[str, Any] = Field(default_factory=dict)


class ResearchAgentEvalOutput(ResearchToolEvalOutput):
    research_agent_output: dict[str, Any] = Field(default_factory=dict)
