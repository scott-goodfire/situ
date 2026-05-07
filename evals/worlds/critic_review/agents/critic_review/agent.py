from __future__ import annotations

from situ.harness.agents import CriticAgent, CriticAgentContext, ResearchAgentOutput
from situ.harness.records import AgentKind, AgentStatus, TaskRecord, TaskStatus
from situ.harness.tools.common import SituToolDeps
from situ.harness.tools.tasks.eligibility import eligible_task_kinds_for_agent

from evals.framework.capture import ToolCallCaptureCapability
from evals.framework.llms import eval_model_name
from evals.worlds.critic_review.models import (
    CriticReviewEvalInput,
    CriticReviewEvalOutput,
)
from evals.worlds.critic_review.world import CRITIC_AGENT_ID, CriticReviewWorld
from evals.worlds.repo_bootstrap.world.world import PROJECT_ID, SESSION_ID, WORKSPACE_ID


def run_critic_review(args: CriticReviewEvalInput) -> CriticReviewEvalOutput:
    world = CriticReviewWorld(seed=args.seed)
    capture = ToolCallCaptureCapability()
    critic_outputs: list[ResearchAgentOutput] = []
    try:
        review_task = _claim_next_task(world)
        if review_task is not None:
            critic_outputs.append(
                _run_critic_pass(
                    world=world,
                    args=args,
                    capture=capture,
                    active_task=review_task,
                )
            )
            _finish_task(
                world,
                task_id=review_task.id,
                status=TaskStatus.DONE,
                result_summary=critic_outputs[-1].summary,
            )
            world.emit_event(
                "session.critic_completed",
                critic_outputs[-1].summary,
                PROJECT_ID,
                SESSION_ID,
                critic_outputs[-1].model_dump(),
            )

        project_board = world.project_board()
        review_activity = _latest_review_activity(project_board)
        return CriticReviewEvalOutput(
            content=_render_content(
                critic_outputs=critic_outputs,
                review_activity=review_activity,
                project_board=project_board,
            ),
            captured_tool_calls=list(capture.tool_calls),
            critic_tool_calls=list(capture.tool_calls),
            critic_outputs=[output.model_dump() for output in critic_outputs],
            events=list(world.events),
            project_board=project_board,
            workspace_files=world.workspace_files(),
            changed_files=world.changed_files(),
            review_activity=review_activity,
            signals={
                "critic_tool_calls": len(capture.tool_calls),
                "review_activities": len(_review_activities(project_board)),
                "done_review_tasks": len(
                    [
                        task
                        for task in project_board.get("tasks", [])
                        if task.get("kind") == "review"
                        and task.get("status") == "done"
                    ]
                ),
            },
        )
    finally:
        world.teardown()


def _run_critic_pass(
    *,
    world: CriticReviewWorld,
    args: CriticReviewEvalInput,
    capture: ToolCallCaptureCapability,
    active_task: TaskRecord,
) -> ResearchAgentOutput:
    agent = CriticAgent(
        model=eval_model_name(),
        capabilities=[capture],
    )
    result = agent.run_sync(
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
            assigned_task_ids=[active_task.id],
        )
    )
    return result.output


def _claim_next_task(world: CriticReviewWorld) -> TaskRecord | None:
    agent = world.repos.agents.ensure_project_agent(
        project_id=PROJECT_ID,
        created_in_session_id=SESSION_ID,
        kind=AgentKind.CRITIC,
        display_name="Critic",
        model_name="eval:model",
    )
    task = world.repos.tasks.claim_next(
        project_id=PROJECT_ID,
        agent_id=agent.id,
        eligible_kinds=eligible_task_kinds_for_agent(agent.kind),
        claimed_in_session_id=SESSION_ID,
    )
    if task is None:
        return None
    world.repos.agents.update(agent_id=agent.id, status=AgentStatus.ACTIVE)
    world.emit_event(
        "task.claimed",
        f"Claimed task {task.id}",
        PROJECT_ID,
        SESSION_ID,
        {"task_id": task.id, "agent_id": agent.id},
    )
    return task


def _finish_task(
    world: CriticReviewWorld,
    *,
    task_id: str,
    status: TaskStatus,
    result_summary: str,
) -> None:
    task = world.repos.tasks.get(task_id=task_id)
    if task is None:
        return
    if task.status in {TaskStatus.DONE, TaskStatus.ABANDONED, TaskStatus.FAILED}:
        if task.assignee_id is not None:
            world.repos.agents.update(agent_id=task.assignee_id, status=AgentStatus.IDLE)
        return
    updated = world.repos.tasks.update(
        task_id=task.id,
        status=status,
        result_summary=result_summary,
        completed_in_session_id=SESSION_ID,
    )
    if updated is None:
        return
    if updated.assignee_id is not None:
        world.repos.agents.update(agent_id=updated.assignee_id, status=AgentStatus.IDLE)
    world.emit_event(
        f"task.{updated.status.value}",
        f"Finished task {updated.id}",
        PROJECT_ID,
        SESSION_ID,
        {"task_id": updated.id, "status": updated.status.value},
    )


def _review_activities(project_board: dict) -> list[dict]:
    return [
        activity
        for activity in project_board.get("experiment_activities", [])
        if (activity.get("payload") or {}).get("activity_type") == "critic_review"
    ]


def _latest_review_activity(project_board: dict) -> dict | None:
    reviews = _review_activities(project_board)
    return reviews[-1] if reviews else None


def _render_content(
    *,
    critic_outputs: list[ResearchAgentOutput],
    review_activity: dict | None,
    project_board: dict,
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
            str(project_board.get("tasks", [])),
        ]
    ).strip()
