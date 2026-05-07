from __future__ import annotations

from situ.harness.agents import ResearchAgent, ResearchAgentContext
from situ.harness.tools.common import SituToolDeps
from evals.framework.capture import ToolCallCaptureCapability
from evals.framework.llms import eval_model_name
from evals.worlds.repo_bootstrap.models import (
    RepoBootstrapEvalInput,
    RepoBootstrapEvalOutput,
)
from evals.worlds.repo_bootstrap.world import (
    SCIENTIST_AGENT_ID,
    SESSION_ID,
    RepoBootstrapWorld,
)


def run_repo_bootstrap_agent(args: RepoBootstrapEvalInput) -> RepoBootstrapEvalOutput:
    world = RepoBootstrapWorld(seed=args.seed)
    capture = ToolCallCaptureCapability()
    try:
        deps = SituToolDeps(
            session_id=SESSION_ID,
            agent_id=SCIENTIST_AGENT_ID,
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
        project_board = world.project_board()
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
            project_board=project_board,
            workspace_files=world.workspace_files(),
            changed_files=changed_files,
            signals={
                "tool_calls": len(capture.tool_calls),
                "events": len(world.events),
                "hypotheses": len(project_board.get("hypotheses", [])),
                "experiments": len(project_board.get("experiments", [])),
                "evaluations": len(project_board.get("evaluations", [])),
                "evaluation_activities": len(
                    project_board.get("evaluation_activities", [])
                ),
                "prepare_changed": "prepare.py" in changed_files,
            },
        )
    finally:
        world.teardown()
