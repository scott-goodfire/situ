from __future__ import annotations

import inspect

from pydantic_ai import Agent

from situ.harness.tools import build_research_toolset
from situ.harness.tools.common import SituToolDeps
from evals.harness.capture import ToolCallCaptureCapability
from evals.harness.llms import eval_model_name
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

    Do the requested action directly with the available tools. Use the ledger
    for all session, objective, hypothesis, experiment, activity, and artifact
    facts. Keep the final answer short, grounded, and explicit about the action
    you completed.
    """
)


def run_research_tool_agent(args: ResearchToolEvalInput) -> ResearchToolEvalOutput:
    world = ResearchSessionWorld(seed=args.seed)
    capture = ToolCallCaptureCapability()
    try:
        deps = SituToolDeps(
            session_id=SESSION_ID,
            agent_id=SCIENTIST_AGENT_ID if args.seed != "projectless" else None,
            repos=world.repos,
            repo_path=str(world.repo_path),
            emit_event=world.emit_event,
        )
        agent = _build_agent(capture)
        result = agent.run_sync(args.prompt, deps=deps)
        return ResearchToolEvalOutput(
            content=str(result.output),
            captured_tool_calls=list(capture.tool_calls),
            events=list(world.events),
            session_graph=world.session_graph(),
            signals={
                "tool_calls": len(capture.tool_calls),
                "events": len(world.events),
            },
        )
    finally:
        world.teardown()


def _build_agent(
    capture: ToolCallCaptureCapability,
) -> Agent[SituToolDeps, str]:
    return Agent[SituToolDeps, str](
        eval_model_name(),
        name=RESEARCH_TOOL_AGENT_NAME,
        deps_type=SituToolDeps,
        output_type=str,
        instructions=RESEARCH_TOOL_AGENT_INSTRUCTIONS,
        toolsets=[build_research_toolset()],
        capabilities=[capture],
    )
