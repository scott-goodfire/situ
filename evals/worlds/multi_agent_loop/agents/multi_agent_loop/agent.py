from __future__ import annotations

from situ.harness.agents import (
    ManagerAgent,
    ManagerAgentContext,
    ResearchAgentOutput,
    ResearcherAgent,
    ResearcherAgentContext,
    ScientistAgent,
    ScientistAgentContext,
)
from situ.harness.records import AgentKind, AgentStatus, TaskRecord, TaskStatus
from situ.harness.tools.common import SituToolDeps
from situ.harness.tools.tasks.eligibility import eligible_task_kinds_for_agent

from evals.harness.capture import ToolCallCaptureCapability
from evals.harness.llms import eval_model_name
from evals.harness.models import CapturedToolCall
from evals.worlds.multi_agent_loop.models import (
    MultiAgentLoopEvalInput,
    MultiAgentLoopEvalOutput,
)
from evals.worlds.multi_agent_loop.world import (
    MANAGER_AGENT_ID,
    PROJECT_ID,
    RESEARCHER_AGENT_ID,
    SCIENTIST_AGENT_ID,
    SESSION_ID,
    WORKSPACE_ID,
    MultiAgentLoopWorld,
)


def run_multi_agent_loop(args: MultiAgentLoopEvalInput) -> MultiAgentLoopEvalOutput:
    world = MultiAgentLoopWorld(seed=args.seed)
    manager_capture = ToolCallCaptureCapability()
    researcher_capture = ToolCallCaptureCapability()
    scientist_capture = ToolCallCaptureCapability()
    final_manager_capture = ToolCallCaptureCapability()
    manager_outputs: list[ResearchAgentOutput] = []
    researcher_outputs: list[ResearchAgentOutput] = []
    scientist_outputs: list[ResearchAgentOutput] = []
    try:
        manager_task = _claim_next_task(world, AgentKind.MANAGER)
        manager_outputs.append(
            _run_manager_pass(
                world=world,
                args=args,
                capture=manager_capture,
                active_task=manager_task,
            )
        )
        if manager_task is not None:
            _finish_task(
                world,
                task_id=manager_task.id,
                status=TaskStatus.DONE,
                result_summary=manager_outputs[-1].summary,
            )

        researcher_outputs.append(
            _run_researcher_pass(
                world=world,
                args=args,
                capture=researcher_capture,
            )
        )

        scientist_outputs.append(
            _run_scientist_pass(
                world=world,
                args=args,
                capture=scientist_capture,
            )
        )

        manager_outputs.append(
            _run_manager_pass(
                world=world,
                args=args,
                capture=final_manager_capture,
                active_task=None,
            )
        )

        session_graph = world.session_graph()
        combined_tool_calls = [
            *manager_capture.tool_calls,
            *researcher_capture.tool_calls,
            *scientist_capture.tool_calls,
            *final_manager_capture.tool_calls,
        ]
        return MultiAgentLoopEvalOutput(
            content=_render_content(
                manager_outputs,
                researcher_outputs,
                scientist_outputs,
            ),
            captured_tool_calls=combined_tool_calls,
            manager_tool_calls=list(manager_capture.tool_calls),
            researcher_tool_calls=list(researcher_capture.tool_calls),
            scientist_tool_calls=list(scientist_capture.tool_calls),
            final_manager_tool_calls=list(final_manager_capture.tool_calls),
            manager_outputs=[output.model_dump() for output in manager_outputs],
            researcher_outputs=[
                output.model_dump() for output in researcher_outputs
            ],
            scientist_outputs=[output.model_dump() for output in scientist_outputs],
            events=list(world.events),
            session_graph=session_graph,
            workspace_files=world.workspace_files(),
            changed_files=world.changed_files(),
            signals={
                "tool_calls": len(combined_tool_calls),
                "manager_tool_calls": len(manager_capture.tool_calls)
                + len(final_manager_capture.tool_calls),
                "researcher_tool_calls": len(researcher_capture.tool_calls),
                "scientist_tool_calls": len(scientist_capture.tool_calls),
                "events": len(world.events),
                "tasks": len(session_graph.get("tasks", [])),
                "done_tasks": len(
                    [
                        task
                        for task in session_graph.get("tasks", [])
                        if task.get("status") == "done"
                    ]
                ),
                "evaluations": len(session_graph.get("evaluations", [])),
                "evaluation_activities": len(
                    session_graph.get("evaluation_activities", [])
                ),
                "changed_files": len(world.changed_files()),
            },
        )
    finally:
        world.teardown()


def _run_manager_pass(
    *,
    world: MultiAgentLoopWorld,
    args: MultiAgentLoopEvalInput,
    capture: ToolCallCaptureCapability,
    active_task: TaskRecord | None,
) -> ResearchAgentOutput:
    agent = ManagerAgent(
        model=eval_model_name(),
        capabilities=[capture],
    )
    result = agent.run_sync(
        ManagerAgentContext(
            deps=_tool_deps(world, MANAGER_AGENT_ID),
            setup_objective=args.objective,
            setup_research_context=args.research_context,
            current_state=world.session_graph(),
            active_task=active_task.model_dump() if active_task is not None else None,
        )
    )
    return result.output


def _run_scientist_pass(
    *,
    world: MultiAgentLoopWorld,
    args: MultiAgentLoopEvalInput,
    capture: ToolCallCaptureCapability,
) -> ResearchAgentOutput:
    agent = ScientistAgent(
        model=eval_model_name(),
        capabilities=[capture],
    )
    result = agent.run_sync(
        ScientistAgentContext(
            deps=_tool_deps(world, SCIENTIST_AGENT_ID),
            setup_objective=args.objective,
            setup_research_context=args.research_context,
            current_state=world.session_graph(),
            max_experiments=1,
            active_task=None,
        )
    )
    return result.output


def _run_researcher_pass(
    *,
    world: MultiAgentLoopWorld,
    args: MultiAgentLoopEvalInput,
    capture: ToolCallCaptureCapability,
) -> ResearchAgentOutput:
    agent = ResearcherAgent(
        model=eval_model_name(),
        capabilities=[capture],
    )
    result = agent.run_sync(
        ResearcherAgentContext(
            deps=_tool_deps(world, RESEARCHER_AGENT_ID),
            setup_objective=args.objective,
            setup_research_context=args.research_context,
            current_state=world.session_graph(),
            active_task=None,
        )
    )
    return result.output


def _tool_deps(world: MultiAgentLoopWorld, agent_id: str) -> SituToolDeps:
    return SituToolDeps(
        session_id=SESSION_ID,
        agent_id=agent_id,
        workspace_id=WORKSPACE_ID,
        project_id=PROJECT_ID,
        repo_path=str(world.workspace_path),
        repos=world.repos,
        emit_event=world.emit_event,
    )


def _claim_next_task(
    world: MultiAgentLoopWorld,
    agent_kind: AgentKind,
) -> TaskRecord | None:
    agent = world.repos.agents.ensure_project_agent(
        project_id=PROJECT_ID,
        created_in_session_id=SESSION_ID,
        kind=agent_kind,
        display_name=_agent_display_name(agent_kind),
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
    world.repos.agents.update(agent.id, status=AgentStatus.ACTIVE)
    world.emit_event(
        "task.claimed",
        f"Claimed task {task.id}",
        PROJECT_ID,
        SESSION_ID,
        {"task_id": task.id, "agent_id": agent.id},
    )
    return task


def _finish_task(
    world: MultiAgentLoopWorld,
    *,
    task_id: str,
    status: TaskStatus,
    result_summary: str,
) -> None:
    task = world.repos.tasks.get(task_id)
    if task is None:
        return
    if task.status in {TaskStatus.DONE, TaskStatus.ABANDONED, TaskStatus.FAILED}:
        if task.assignee_id is not None:
            world.repos.agents.update(task.assignee_id, status=AgentStatus.IDLE)
        return
    updated = world.repos.tasks.update(
        task.id,
        status=status,
        result_summary=result_summary,
        completed_in_session_id=SESSION_ID,
    )
    if updated is None:
        return
    if updated.assignee_id is not None:
        world.repos.agents.update(updated.assignee_id, status=AgentStatus.IDLE)
    world.emit_event(
        f"task.{updated.status.value}",
        f"Finished task {updated.id}",
        PROJECT_ID,
        SESSION_ID,
        {"task_id": updated.id, "status": updated.status.value},
    )


def _render_content(
    manager_outputs: list[ResearchAgentOutput],
    researcher_outputs: list[ResearchAgentOutput],
    scientist_outputs: list[ResearchAgentOutput],
) -> str:
    outputs = [*manager_outputs, *researcher_outputs, *scientist_outputs]
    parts: list[str] = []
    for output in outputs:
        parts.extend([output.summary, output.next_focus, *output.risk_notes])
    return " ".join(part for part in parts if part).strip()


def calls_for_role(
    output: MultiAgentLoopEvalOutput,
    role: str,
) -> list[CapturedToolCall]:
    if role == "manager":
        return [*output.manager_tool_calls, *output.final_manager_tool_calls]
    if role == "researcher":
        return list(output.researcher_tool_calls)
    if role == "scientist":
        return list(output.scientist_tool_calls)
    raise ValueError(f"unknown role: {role}")


def _agent_display_name(agent_kind: AgentKind) -> str:
    return {
        AgentKind.MANAGER: "Manager",
        AgentKind.RESEARCHER: "Researcher",
        AgentKind.SCIENTIST: "Scientist",
    }[agent_kind]
