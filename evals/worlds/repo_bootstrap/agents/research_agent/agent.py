from __future__ import annotations

from almanac.harness.agents import ResearchAgent, ResearchAgentContext
from almanac.harness.tools.common import AlmanacToolDeps
from evals.harness.capture import ToolCallCaptureCapability
from evals.harness.llms import eval_model_name
from evals.worlds.repo_bootstrap.models import (
    RepoBootstrapEvalInput,
    RepoBootstrapEvalOutput,
)
from evals.worlds.repo_bootstrap.world import RepoBootstrapWorld, SESSION_ID


def run_repo_bootstrap_agent(args: RepoBootstrapEvalInput) -> RepoBootstrapEvalOutput:
    world = RepoBootstrapWorld(seed=args.seed)
    capture = ToolCallCaptureCapability()
    try:
        deps = AlmanacToolDeps(
            session_id=SESSION_ID,
            repo_path=str(world.workspace_path),
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
        session_graph = world.session_graph()
        changed_files = world.changed_files()
        return RepoBootstrapEvalOutput(
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
            session_graph=session_graph,
            workspace_files=world.workspace_files(),
            changed_files=changed_files,
            signals={
                "tool_calls": len(capture.tool_calls),
                "events": len(world.events),
                "hypotheses": len(session_graph.get("hypotheses", [])),
                "experiments": len(session_graph.get("experiments", [])),
                "evaluations": len(session_graph.get("evaluations", [])),
                "evaluation_activities": len(
                    session_graph.get("evaluation_activities", [])
                ),
                "prepare_changed": "prepare.py" in changed_files,
            },
        )
    finally:
        world.teardown()
