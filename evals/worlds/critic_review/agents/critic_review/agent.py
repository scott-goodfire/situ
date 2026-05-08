from __future__ import annotations

from situ.harness.agents import CriticAgent, CriticAgentContext, ResearchAgentOutput
from situ.harness.tools.common import SituToolDeps

from evals.framework.capture import ToolCallCaptureCapability
from evals.framework.llms import eval_model_name
from evals.worlds.critic_review.models import (
    CriticReviewEvalInput,
    CriticReviewEvalOutput,
)
from evals.worlds.critic_review.world import CRITIC_AGENT_ID, CriticReviewWorld
from evals.worlds.repo_bootstrap.world.world import PROJECT_ID, SESSION_ID, WORKSPACE_ID


async def run_critic_review(args: CriticReviewEvalInput) -> CriticReviewEvalOutput:
    world = await CriticReviewWorld.create(seed=args.seed)
    capture = ToolCallCaptureCapability()
    critic_outputs: list[ResearchAgentOutput] = []
    try:
        critic_outputs.append(
            await _run_critic_pass(
                world=world,
                args=args,
                capture=capture,
            )
        )
        await world.emit_event(
            "session.critic_completed",
            critic_outputs[-1].summary,
            PROJECT_ID,
            SESSION_ID,
            critic_outputs[-1].model_dump(),
        )

        project_overview = await world.project_overview()
        review_activity = _latest_review_activity(project_overview)
        return CriticReviewEvalOutput(
            content=_render_content(
                critic_outputs=critic_outputs,
                review_activity=review_activity,
                project_overview=project_overview,
            ),
            captured_tool_calls=list(capture.tool_calls),
            critic_tool_calls=list(capture.tool_calls),
            critic_outputs=[output.model_dump() for output in critic_outputs],
            events=list(world.events),
            project_overview=project_overview,
            workspace_files=world.workspace_files(),
            changed_files=world.changed_files(),
            review_activity=review_activity,
            signals={
                "critic_tool_calls": len(capture.tool_calls),
                "review_activities": len(_review_activities(project_overview)),
                "terminal_review_records": len(
                    [
                        experiment
                        for experiment in project_overview.get("experiments", [])
                        if experiment.get("status") in {"done", "canceled", "failed"}
                    ]
                ),
            },
        )
    finally:
        world.teardown()


async def _run_critic_pass(
    *,
    world: CriticReviewWorld,
    args: CriticReviewEvalInput,
    capture: ToolCallCaptureCapability,
) -> ResearchAgentOutput:
    agent = CriticAgent(
        model=await eval_model_name(),
        capabilities=[capture],
    )
    result = await agent.run(
        CriticAgentContext(
            deps=SituToolDeps(
                session_id=SESSION_ID,
                agent_id=CRITIC_AGENT_ID,
                workspace_id=WORKSPACE_ID,
                project_id=PROJECT_ID,
                repo_path=str(world.workspace_path),
                repos=world.repos,
                emit_event=world.emit_event,
            ),
            setup_objective=args.objective,
            setup_research_context=args.research_context,
            assigned_task_ids=[],
        )
    )
    return result.output


def _review_activities(project_overview: dict) -> list[dict]:
    return [
        activity
        for activity in project_overview.get("experiment_activities", [])
        if activity.get("kind") == "comment"
        and activity.get("actor") in {"agent", "critic"}
    ]


def _latest_review_activity(project_overview: dict) -> dict | None:
    reviews = _review_activities(project_overview)
    return reviews[-1] if reviews else None


def _render_content(
    *,
    critic_outputs: list[ResearchAgentOutput],
    review_activity: dict | None,
    project_overview: dict,
) -> str:
    output_text = " ".join(
        part
        for output in critic_outputs
        for part in [output.summary, output.next_focus, *output.risk_notes]
        if part
    )
    review_text = ""
    if review_activity is not None:
        review_text = " ".join(
            [
                review_activity.get("body", ""),
                str(review_activity.get("payload", {})),
            ]
        )
    return " ".join(
        [
            output_text,
            review_text,
            str(project_overview.get("tasks", [])),
        ]
    ).strip()
