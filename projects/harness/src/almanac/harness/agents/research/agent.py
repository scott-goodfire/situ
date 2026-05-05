from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from pydantic import BaseModel, Field
from pydantic_ai import Agent, FunctionToolset
from pydantic_ai.capabilities.abstract import AbstractCapability
from pydantic_ai.models import Model

from ...tools import build_research_toolset
from ...tools.common import AlmanacToolDeps
from ..common import AlmanacAgentContext, AlmanacAgentPrompt, BaseAlmanacAgent
from .prompt import RESEARCH_AGENT_INSTRUCTIONS, build_research_agent_user_prompt

RESEARCH_AGENT_NAME = "almanac-research-agent"


class ResearchAgentOutput(BaseModel):
    summary: str
    should_continue: bool = True
    next_focus: str = ""
    risk_notes: list[str] = Field(default_factory=list)


class ResearchAgentContext(AlmanacAgentContext[AlmanacToolDeps]):
    objective: str = ""
    user_prompt: str | None = None


class ResearchAgent(
    BaseAlmanacAgent[ResearchAgentContext, ResearchAgentOutput]
):
    model: Model | str
    toolsets: Sequence[FunctionToolset[AlmanacToolDeps]] = Field(default_factory=tuple)
    capabilities: Sequence[AbstractCapability[Any]] = Field(default_factory=tuple)

    def generate_prompt(self, context: ResearchAgentContext) -> AlmanacAgentPrompt:
        return AlmanacAgentPrompt(
            instructions=RESEARCH_AGENT_INSTRUCTIONS,
            user_prompt=build_research_agent_user_prompt(
                objective=context.objective,
                request=context.user_prompt,
            ),
        )

    def build_agent(
        self,
        *,
        context: ResearchAgentContext,
        prompt: AlmanacAgentPrompt,
    ) -> Agent[AlmanacToolDeps, ResearchAgentOutput]:
        _ = (context, prompt)
        toolsets = list(self.toolsets) or [build_research_toolset()]
        return Agent[AlmanacToolDeps, ResearchAgentOutput](
            name=RESEARCH_AGENT_NAME,
            model=self.model,
            deps_type=AlmanacToolDeps,
            output_type=ResearchAgentOutput,
            instructions=RESEARCH_AGENT_INSTRUCTIONS,
            toolsets=toolsets,
            capabilities=list(self.capabilities),
        )
