from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import AgentStatus
from ...common import BaseSituTool, SituToolDeps
from ..eligibility import eligible_task_kinds_for_agent
from .models import ClaimTaskResult


class ClaimTaskTool(BaseSituTool[SituToolDeps, ClaimTaskResult]):
    name = "claim_task"
    result_type = ClaimTaskResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        agent_id: str | None = None,
        task_id: str | None = None,
        **_kwargs: Any,
    ) -> ClaimTaskResult:
        """Claim a runnable task for an agent if its kind is eligible."""
        repos = await ctx.deps.get_repos()
        resolved_agent_id = agent_id or ctx.deps.agent_id
        if resolved_agent_id is None:
            raise ValueError(
                "agent_id is required when tool deps do not identify the current agent"
            )
        agent = await repos.agents.get(agent_id=resolved_agent_id)
        if agent is None:
            raise ValueError(f"agent not found: {resolved_agent_id}")
        eligible_kinds = eligible_task_kinds_for_agent(agent.kind)
        task = (
            await repos.tasks.claim(
                task_id=task_id,
                agent_id=agent.id,
                eligible_kinds=eligible_kinds,
                claimed_in_session_id=ctx.deps.session_id,
            )
            if task_id is not None
            else await repos.tasks.claim_next(
                project_id=agent.project_id,
                agent_id=agent.id,
                eligible_kinds=eligible_kinds,
                claimed_in_session_id=ctx.deps.session_id,
            )
        )
        if task is None:
            return ClaimTaskResult(success=True, task=None)

        updated_agent = (
            await repos.agents.update(agent_id=agent.id, status=AgentStatus.ACTIVE)
            or agent
        )
        event = await ctx.deps.record_event(
            event_type="task.claimed",
            message=f"Claimed task {task.id}",
            payload={"task_id": task.id, "agent_id": agent.id},
        )
        await ctx.deps.publish_record(record=task, event=event)
        await ctx.deps.publish_record(record=updated_agent, event=event)
        return ClaimTaskResult(success=True, task=task.model_dump())
