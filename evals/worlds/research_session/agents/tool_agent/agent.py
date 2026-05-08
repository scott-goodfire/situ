from __future__ import annotations

import inspect

from pydantic_ai import Agent
from pydantic_ai import FunctionToolset

from situ.harness.config import DEFAULTS
from situ.harness.tools import build_manager_toolset, build_scientist_toolset
from situ.harness.tools.common import SituToolDeps
from evals.framework.capture import ToolCallCaptureCapability
from evals.framework.llms import eval_model_name
from evals.worlds.research_session.models import (
    ResearchToolEvalInput,
    ResearchToolEvalOutput,
)
from evals.worlds.research_session.world import (
    SCIENTIST_AGENT_ID,
    SESSION_ID,
    ResearchSessionWorld,
)

RESEARCH_TOOL_AGENT_NAME = "situ-research-tool-eval-agent"
RESEARCH_TOOL_AGENT_INSTRUCTIONS = inspect.cleandoc(
    """
    You are helping test Situ's research tool surface.

    Do the requested action directly with the available tools. Use the project-state tools
    for all session, objective, hypothesis, baseline, experiment, evaluation,
    measurement, activity, and artifact facts. Prefer focused `list_*` tools
    when the prompt asks you to read one type of record. Keep the final answer
    short, grounded, and explicit about the action you completed.
    """
)


async def run_research_tool_agent(args: ResearchToolEvalInput) -> ResearchToolEvalOutput:
    world = await ResearchSessionWorld.create(seed=args.seed)
    capture = ToolCallCaptureCapability()
    try:
        deps = SituToolDeps(
            session_id=SESSION_ID,
            agent_id=_agent_id(args),
            repos=world.repos,
            repo_path=str(world.repo_path),
            emit_event=world.emit_event,
        )
        agent = await _build_agent(capture, toolset=args.toolset)
        result = await agent.run(args.prompt, deps=deps)
        return ResearchToolEvalOutput(
            content=str(result.output),
            captured_tool_calls=list(capture.tool_calls),
            events=list(world.events),
            project_overview=await world.project_overview(),
            signals={
                "tool_calls": len(capture.tool_calls),
                "events": len(world.events),
            },
        )
    finally:
        world.teardown()


async def _build_agent(
    capture: ToolCallCaptureCapability,
    *,
    toolset: str,
) -> Agent[SituToolDeps, str]:
    return Agent[SituToolDeps, str](
        await eval_model_name(),
        name=RESEARCH_TOOL_AGENT_NAME,
        deps_type=SituToolDeps,
        output_type=str,
        instructions=RESEARCH_TOOL_AGENT_INSTRUCTIONS,
        toolsets=[_build_toolset(toolset)],
        model_settings=DEFAULTS.model_settings(),
        capabilities=[capture],
    )


def _build_toolset(toolset: str) -> FunctionToolset[SituToolDeps]:
    if toolset == "manager":
        return build_manager_toolset()
    return build_scientist_toolset()


def _agent_id(args: ResearchToolEvalInput) -> str | None:
    if args.seed == "projectless" or args.toolset == "manager":
        return None
    return SCIENTIST_AGENT_ID
