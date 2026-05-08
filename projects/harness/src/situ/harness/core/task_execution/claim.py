from __future__ import annotations

from ...records import (
    AgentKind,
    AgentRecord,
    AgentStatus,
    TaskRecord,
    TaskStatus,
)
from ...repositories import Repositories
from ...tools.tasks.eligibility import eligible_task_kinds_for_agent
from .events import publish_record, record_event


def agent_display_name(agent_kind: AgentKind) -> str:
    return {
        AgentKind.MANAGER: "Manager",
        AgentKind.RESEARCHER: "Researcher",
        AgentKind.SCIENTIST: "Scientist",
        AgentKind.CRITIC: "Critic",
    }[agent_kind]


async def claim_task(
    repos: Repositories,
    *,
    task_id: str,
    session_id: str,
    project_id: str,
    agent_kind: AgentKind,
    model_name: str | None = None,
) -> tuple[TaskRecord, AgentRecord] | None:
    eligible_kinds = eligible_task_kinds_for_agent(agent_kind)

    if agent_kind == AgentKind.MANAGER:
        agent = await repos.agents.ensure_project_agent(
            project_id=project_id,
            created_in_session_id=session_id,
            kind=agent_kind,
            display_name=agent_display_name(agent_kind),
            model_name=model_name,
        )
        agent_already_existed = True
    else:
        existing = await repos.agents.get(
            agent_id=f"agent_{project_id}_{agent_kind.value}_{task_id}",
        )
        agent_already_existed = existing is not None
        agent = await repos.agents.ensure_task_agent(
            project_id=project_id,
            task_id=task_id,
            created_in_session_id=session_id,
            kind=agent_kind,
            display_name=f"{agent_display_name(agent_kind)} {task_id}",
            model_name=model_name,
        )

    if not agent_already_existed:
        created_event = await record_event(
            repos,
            event_type="agent.created",
            message=f"Created {agent.display_name} agent",
            session_id=session_id,
            project_id=project_id,
            payload={
                "agent_id": agent.id,
                "kind": agent.kind.value,
                "task_id": task_id,
            },
        )
        await publish_record(repos=repos, project_id=project_id, record=agent, cursor=created_event.id)

    claimed = await repos.tasks.claim(
        task_id=task_id,
        agent_id=agent.id,
        eligible_kinds=eligible_kinds,
        claimed_in_session_id=session_id,
    )
    if claimed is None:
        return None

    updated_agent = (
        await repos.agents.update(agent_id=agent.id, status=AgentStatus.ACTIVE) or agent
    )
    event = await record_event(
        repos,
        event_type="task.claimed",
        message=f"Claimed task {claimed.id}",
        session_id=session_id,
        project_id=project_id,
        payload={"task_id": claimed.id, "agent_id": agent.id},
    )
    await publish_record(repos=repos, project_id=project_id, record=claimed, cursor=event.id)
    await publish_record(repos=repos, project_id=project_id, record=updated_agent, cursor=event.id)
    return claimed, updated_agent


async def finish_task(
    repos: Repositories,
    *,
    task: TaskRecord,
    session_id: str,
    status: TaskStatus,
    result_summary: str,
    force_terminal_update: bool = False,
) -> None:
    current = await repos.tasks.get(task_id=task.id) or task
    terminal_statuses = {TaskStatus.DONE, TaskStatus.CANCELED, TaskStatus.FAILED}
    if current.status in terminal_statuses and not force_terminal_update:
        if current.assignee_id is not None:
            await repos.agents.update(
                agent_id=current.assignee_id,
                status=AgentStatus.IDLE,
            )
        return

    updated_task = await repos.tasks.update(
        task_id=task.id,
        status=status,
        result_summary=(
            result_summary if force_terminal_update else current.result_summary or result_summary
        ),
        completed_in_session_id=session_id,
    )
    if updated_task is None:
        return

    updated_agent = (
        await repos.agents.update(agent_id=updated_task.assignee_id, status=AgentStatus.IDLE)
        if updated_task.assignee_id is not None
        else None
    )
    event = await record_event(
        repos,
        event_type=f"task.{updated_task.status.value}",
        message=f"Finished task {updated_task.id}",
        session_id=session_id,
        project_id=updated_task.project_id,
        payload={
            "task_id": updated_task.id,
            "status": updated_task.status.value,
        },
    )
    await publish_record(repos=repos, project_id=updated_task.project_id, record=updated_task, cursor=event.id)
    if updated_agent is not None:
        await publish_record(repos=repos, project_id=updated_task.project_id, record=updated_agent, cursor=event.id)
