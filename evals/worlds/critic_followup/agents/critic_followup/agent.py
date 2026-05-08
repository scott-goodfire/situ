from __future__ import annotations

from situ.harness.agents import ManagerAgent, ManagerAgentContext, ResearchAgentOutput
from situ.harness.records import AgentKind, AgentStatus, TaskRecord, TaskStatus
from situ.harness.tools.common import SituToolDeps
from situ.harness.tools.tasks.eligibility import eligible_task_kinds_for_agent

from evals.framework.capture import ToolCallCaptureCapability
from evals.framework.llms import eval_model_name
from evals.worlds.critic_followup.models import (
    CriticFollowupEvalInput,
    CriticFollowupEvalOutput,
)
from evals.worlds.critic_followup.world import MANAGER_AGENT_ID, CriticFollowupWorld
from evals.worlds.repo_bootstrap.world.world import PROJECT_ID, SESSION_ID, WORKSPACE_ID


async def run_critic_followup(args: CriticFollowupEvalInput) -> CriticFollowupEvalOutput:
    world = await CriticFollowupWorld.create(seed=args.seed)
    capture = ToolCallCaptureCapability()
    manager_outputs: list[ResearchAgentOutput] = []
    try:
        plan_task = await _claim_next_task(world)
        if plan_task is not None:
            manager_outputs.append(
                await _run_manager_pass(
                    world=world,
                    args=args,
                    capture=capture,
                    active_task=plan_task,
                )
            )
            await _finish_task(
                world,
                task_id=plan_task.id,
                status=TaskStatus.DONE,
                result_summary=manager_outputs[-1].summary,
            )
            await world.emit_event(
                "session.manager_completed",
                manager_outputs[-1].summary,
                PROJECT_ID,
                SESSION_ID,
                manager_outputs[-1].model_dump(),
            )

        project_overview = await world.project_overview()
        return CriticFollowupEvalOutput(
            content=_render_content(
                manager_outputs=manager_outputs,
                project_overview=project_overview,
            ),
            captured_tool_calls=list(capture.tool_calls),
            manager_tool_calls=list(capture.tool_calls),
            manager_outputs=[output.model_dump() for output in manager_outputs],
            events=list(world.events),
            project_overview=project_overview,
            workspace_files=world.workspace_files(),
            changed_files=world.changed_files(),
            signals={
                "manager_tool_calls": len(capture.tool_calls),
                "manager_created_tasks": len(_manager_created_tasks(project_overview)),
                "events": len(world.events),
            },
        )
    finally:
        world.teardown()


async def _run_manager_pass(
    *,
    world: CriticFollowupWorld,
    args: CriticFollowupEvalInput,
    capture: ToolCallCaptureCapability,
    active_task: TaskRecord,
) -> ResearchAgentOutput:
    agent = ManagerAgent(
        model=await eval_model_name(),
        capabilities=[capture],
    )
    result = await agent.run(
        ManagerAgentContext(
            deps=SituToolDeps(
                session_id=SESSION_ID,
                agent_id=MANAGER_AGENT_ID,
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


async def _claim_next_task(world: CriticFollowupWorld) -> TaskRecord | None:
    agent = await world.repos.agents.ensure_project_agent(
        project_id=PROJECT_ID,
        created_in_session_id=SESSION_ID,
        kind=AgentKind.MANAGER,
        display_name="Manager",
        model_name="eval:model",
    )
    task = await world.repos.tasks.claim_next(
        project_id=PROJECT_ID,
        agent_id=agent.id,
        eligible_kinds=eligible_task_kinds_for_agent(agent.kind),
        claimed_in_session_id=SESSION_ID,
    )
    if task is None:
        return None
    await world.repos.agents.update(agent_id=agent.id, status=AgentStatus.ACTIVE)
    await world.emit_event(
        "task.claimed",
        f"Claimed task {task.id}",
        PROJECT_ID,
        SESSION_ID,
        {"task_id": task.id, "agent_id": agent.id},
    )
    return task


async def _finish_task(
    world: CriticFollowupWorld,
    *,
    task_id: str,
    status: TaskStatus,
    result_summary: str,
) -> None:
    task = await world.repos.tasks.get(task_id=task_id)
    if task is None:
        return
    if task.status in {TaskStatus.DONE, TaskStatus.ABANDONED, TaskStatus.FAILED}:
        if task.assignee_id is not None:
            await world.repos.agents.update(agent_id=task.assignee_id, status=AgentStatus.IDLE)
        return
    updated = await world.repos.tasks.update(
        task_id=task.id,
        status=status,
        result_summary=result_summary,
        completed_in_session_id=SESSION_ID,
    )
    if updated is None:
        return
    if updated.assignee_id is not None:
        await world.repos.agents.update(agent_id=updated.assignee_id, status=AgentStatus.IDLE)
    await world.emit_event(
        f"task.{updated.status.value}",
        f"Finished task {updated.id}",
        PROJECT_ID,
        SESSION_ID,
        {"task_id": updated.id, "status": updated.status.value},
    )


def _manager_created_tasks(project_overview: dict) -> list[dict]:
    return [
        task
        for task in project_overview.get("tasks", [])
        if task.get("source_kind") == "manager"
        and task.get("kind") != "plan"
        and task.get("status") == "backlog"
    ]


def _render_content(
    *,
    manager_outputs: list[ResearchAgentOutput],
    project_overview: dict,
) -> str:
    output_text = " ".join(
        part
        for output in manager_outputs
        for part in [output.summary, output.next_focus, *output.risk_notes]
        if part
    )
    task_text = " ".join(
        " ".join(
            [
                task.get("kind", ""),
                task.get("title", ""),
                task.get("content", ""),
                str(task.get("payload", {})),
            ]
        )
        for task in project_overview.get("tasks", [])
    )
    review_text = " ".join(
        " ".join([activity.get("body", ""), str(activity.get("payload", {}))])
        for activity in project_overview.get("experiment_activities", [])
    )
    return " ".join([output_text, task_text, review_text]).strip()
