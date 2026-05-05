from __future__ import annotations

from almanac.harness.agents import ResearchAgent, ResearchAgentContext
from almanac.harness.tools.common import AlmanacToolDeps
from evals.harness.capture import ToolCallCaptureCapability
from evals.harness.llms import eval_model_name
from evals.worlds.research_session.models import (
    ResearchAgentEvalInput,
    ResearchAgentEvalOutput,
)
from evals.worlds.research_session.world import ResearchSessionWorld, SESSION_ID


def run_research_agent(args: ResearchAgentEvalInput) -> ResearchAgentEvalOutput:
    world = ResearchSessionWorld(seed=args.seed)
    capture = ToolCallCaptureCapability()
    try:
        deps = AlmanacToolDeps(
            session_id=SESSION_ID,
            repos=world.repos,
            emit_event=world.emit_event,
        )
        agent = ResearchAgent(
            model=eval_model_name(),
            capabilities=[capture],
        )
        result = agent.run_sync(
            ResearchAgentContext(
                deps=deps,
                objective=args.objective,
                user_prompt=args.prompt,
            )
        )
        output = result.output
        return ResearchAgentEvalOutput(
            content=" ".join(
                [
                    output.summary,
                    output.next_focus,
                    " ".join(output.risk_notes),
                ]
            ).strip(),
            research_agent_output=output.model_dump(),
            captured_tool_calls=list(capture.tool_calls),
            events=list(world.events),
            session_graph=world.session_graph(),
            signals={
                "tool_calls": len(capture.tool_calls),
                "events": len(world.events),
                "hypotheses": len(world.session_graph().get("hypotheses", [])),
                "experiments": len(world.session_graph().get("experiments", [])),
            },
        )
    finally:
        world.teardown()
