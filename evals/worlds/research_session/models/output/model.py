from __future__ import annotations

from typing import Any

from pydantic import Field

from evals.harness.models import AlmanacEvalOutput


class ResearchToolEvalOutput(AlmanacEvalOutput):
    session_graph: dict[str, Any] = Field(default_factory=dict)


class ResearchAgentEvalOutput(ResearchToolEvalOutput):
    research_agent_output: dict[str, Any] = Field(default_factory=dict)
