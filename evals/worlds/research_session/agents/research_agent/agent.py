from __future__ import annotations

from situ.harness.agents import ResearchAgent, ResearchAgentContext
from situ.harness.tools.common import SituToolDeps
from evals.framework.capture import ToolCallCaptureCapability
from evals.framework.llms import eval_model_name
from evals.worlds.research_session.models import (
    ResearchAgentEvalInput,
    ResearchAgentEvalOutput,
)
from evals.worlds.research_session.world import (
    SCIENTIST_AGENT_ID,
    SESSION_ID,
    ResearchSessionWorld,
)


async def run_research_agent(args: ResearchAgentEvalInput) -> ResearchAgentEvalOutput:
    world = await ResearchSessionWorld.create(seed=args.seed)
    capture = ToolCallCaptureCapability()
    try:
        deps = SituToolDeps(
            session_id=SESSION_ID,
            agent_id=SCIENTIST_AGENT_ID,
            repos=world.repos,
            repo_path=str(world.repo_path),
            emit_event=world.emit_event,
        )
        agent = ResearchAgent(
            model=await eval_model_name(),
            capabilities=[capture],
        )
        result = await agent.run(
            ResearchAgentContext(
                deps=deps,
                objective=args.objective,
                user_prompt=args.prompt,
            )
        )
        output = result.output
        project_board = await world.project_board()
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
            project_board=project_board,
            signals={
                "tool_calls": len(capture.tool_calls),
                "events": len(world.events),
                "hypotheses": len(project_board.get("hypotheses", [])),
                "experiments": len(project_board.get("experiments", [])),
            },
        )
    finally:
        world.teardown()
