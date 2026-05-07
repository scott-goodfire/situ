from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from pydantic import BaseModel, Field
from pydantic_ai import Agent, FunctionToolset
from pydantic_ai.capabilities.abstract import AbstractCapability
from pydantic_ai.models import Model

from ...config import DEFAULTS
from ...tools import (
    build_manager_toolset,
    build_research_toolset,
    build_researcher_toolset,
    build_workspace_readonly_toolset,
    build_workspace_toolset,
)
from ...tools.common import SituToolDeps
from ..common import SituAgentContext, SituAgentPrompt, BaseSituAgent
from .prompt import (
    MANAGER_AGENT_INSTRUCTIONS,
    RESEARCHER_AGENT_INSTRUCTIONS,
    RESEARCH_AGENT_INSTRUCTIONS,
    build_proposal_round_prompt,
    build_research_agent_user_prompt,
    build_researcher_run_prompt,
    build_session_run_prompt,
)

RESEARCH_AGENT_NAME = "situ-research-agent"
RESEARCHER_AGENT_NAME = "situ-researcher-agent"
MANAGER_AGENT_NAME = "situ-manager-agent"


class ResearchAgentOutput(BaseModel):
    summary: str
    should_continue: bool = True
    next_focus: str = ""
    risk_notes: list[str] = Field(default_factory=list)


class ResearchAgentContext(SituAgentContext[SituToolDeps]):
    objective: str = ""
    user_prompt: str | None = None


class ManagerAgentContext(SituAgentContext[SituToolDeps]):
    setup_objective: str = ""
    setup_research_context: str = ""
    current_state: dict[str, Any] = Field(default_factory=dict)
    active_task: dict[str, Any] | None = None


class ScientistAgentContext(SituAgentContext[SituToolDeps]):
    setup_objective: str = ""
    setup_research_context: str = ""
    current_state: dict[str, Any] = Field(default_factory=dict)
    max_experiments: int = 1
    active_task: dict[str, Any] | None = None


class ResearcherAgentContext(SituAgentContext[SituToolDeps]):
    setup_objective: str = ""
    setup_research_context: str = ""
    current_state: dict[str, Any] = Field(default_factory=dict)
    active_task: dict[str, Any] | None = None


class ResearchAgent(
    BaseSituAgent[ResearchAgentContext, ResearchAgentOutput]
):
    model: Model | str
    toolsets: Sequence[FunctionToolset[SituToolDeps]] = Field(default_factory=tuple)
    capabilities: Sequence[AbstractCapability[Any]] = Field(default_factory=tuple)

    def generate_prompt(self, context: ResearchAgentContext) -> SituAgentPrompt:
        return SituAgentPrompt(
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
        prompt: SituAgentPrompt,
    ) -> Agent[SituToolDeps, ResearchAgentOutput]:
        _ = (context, prompt)
        toolsets = list(self.toolsets) or [
            build_research_toolset(),
            build_workspace_toolset(),
        ]
        return Agent[SituToolDeps, ResearchAgentOutput](
            name=RESEARCH_AGENT_NAME,
            model=self.model,
            deps_type=SituToolDeps,
            output_type=ResearchAgentOutput,
            instructions=RESEARCH_AGENT_INSTRUCTIONS,
            toolsets=toolsets,
            model_settings=DEFAULTS.model_settings(),
            capabilities=list(self.capabilities),
        )


class ManagerAgent(BaseSituAgent[ManagerAgentContext, ResearchAgentOutput]):
    model: Model | str
    capabilities: Sequence[AbstractCapability[Any]] = Field(default_factory=tuple)

    def generate_prompt(self, context: ManagerAgentContext) -> SituAgentPrompt:
        return SituAgentPrompt(
            instructions=MANAGER_AGENT_INSTRUCTIONS,
            user_prompt=build_proposal_round_prompt(
                setup_objective=context.setup_objective,
                setup_research_context=context.setup_research_context,
                current_state=context.current_state,
                active_task=context.active_task,
            ),
        )

    def build_agent(
        self,
        *,
        context: ManagerAgentContext,
        prompt: SituAgentPrompt,
    ) -> Agent[SituToolDeps, ResearchAgentOutput]:
        _ = (context, prompt)
        return Agent[SituToolDeps, ResearchAgentOutput](
            name=MANAGER_AGENT_NAME,
            model=self.model,
            deps_type=SituToolDeps,
            output_type=ResearchAgentOutput,
            instructions=MANAGER_AGENT_INSTRUCTIONS,
            toolsets=[build_manager_toolset()],
            model_settings=DEFAULTS.model_settings(),
            capabilities=list(self.capabilities),
        )


class ScientistAgent(BaseSituAgent[ScientistAgentContext, ResearchAgentOutput]):
    model: Model | str
    capabilities: Sequence[AbstractCapability[Any]] = Field(default_factory=tuple)

    def generate_prompt(self, context: ScientistAgentContext) -> SituAgentPrompt:
        return SituAgentPrompt(
            instructions=RESEARCH_AGENT_INSTRUCTIONS,
            user_prompt=build_session_run_prompt(
                setup_objective=context.setup_objective,
                setup_research_context=context.setup_research_context,
                current_state=context.current_state,
                max_experiments=context.max_experiments,
                active_task=context.active_task,
            ),
        )

    def build_agent(
        self,
        *,
        context: ScientistAgentContext,
        prompt: SituAgentPrompt,
    ) -> Agent[SituToolDeps, ResearchAgentOutput]:
        _ = (context, prompt)
        return Agent[SituToolDeps, ResearchAgentOutput](
            name=RESEARCH_AGENT_NAME,
            model=self.model,
            deps_type=SituToolDeps,
            output_type=ResearchAgentOutput,
            instructions=RESEARCH_AGENT_INSTRUCTIONS,
            toolsets=[
                build_research_toolset(),
                build_workspace_toolset(),
            ],
            model_settings=DEFAULTS.model_settings(),
            capabilities=list(self.capabilities),
        )


class ResearcherAgent(BaseSituAgent[ResearcherAgentContext, ResearchAgentOutput]):
    model: Model | str
    capabilities: Sequence[AbstractCapability[Any]] = Field(default_factory=tuple)

    def generate_prompt(self, context: ResearcherAgentContext) -> SituAgentPrompt:
        return SituAgentPrompt(
            instructions=RESEARCHER_AGENT_INSTRUCTIONS,
            user_prompt=build_researcher_run_prompt(
                setup_objective=context.setup_objective,
                setup_research_context=context.setup_research_context,
                current_state=context.current_state,
                active_task=context.active_task,
            ),
        )

    def build_agent(
        self,
        *,
        context: ResearcherAgentContext,
        prompt: SituAgentPrompt,
    ) -> Agent[SituToolDeps, ResearchAgentOutput]:
        _ = (context, prompt)
        return Agent[SituToolDeps, ResearchAgentOutput](
            name=RESEARCHER_AGENT_NAME,
            model=self.model,
            deps_type=SituToolDeps,
            output_type=ResearchAgentOutput,
            instructions=RESEARCHER_AGENT_INSTRUCTIONS,
            toolsets=[
                build_researcher_toolset(),
                build_workspace_readonly_toolset(),
            ],
            model_settings=DEFAULTS.model_settings(),
            capabilities=list(self.capabilities),
        )
