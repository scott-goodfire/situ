from __future__ import annotations

import inspect
from collections.abc import Sequence
from typing import Any

from pydantic import BaseModel, Field
from pydantic_ai import Agent, FunctionToolset
from pydantic_ai.capabilities.abstract import AbstractCapability
from pydantic_ai.models import Model

from ...tools import build_research_toolset
from ...tools.common import AlmanacToolDeps
from ..common import AlmanacAgentContext, AlmanacAgentPrompt, BaseAlmanacAgent

RESEARCH_AGENT_NAME = "almanac_research_agent"
RESEARCH_AGENT_INSTRUCTIONS = inspect.cleandoc(
    """
    You are Almanac's research agent. Your job is to keep an autoresearch
    session legible and grounded in Almanac's product models. Use tools to
    inspect current session state, create or update hypotheses and experiments
    when needed, and leave durable comments for meaningful observations. Do not
    claim an experiment succeeded unless the session includes recorded results
    for it.
    """
)


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
        prompt = context.user_prompt or (
            "Inspect the current session. Summarize what is known, add comments "
            "only when the state supports them, and suggest the next focus."
        )
        return AlmanacAgentPrompt(
            instructions=RESEARCH_AGENT_INSTRUCTIONS,
            user_prompt=f"Objective: {context.objective}\n\n{prompt}",
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
