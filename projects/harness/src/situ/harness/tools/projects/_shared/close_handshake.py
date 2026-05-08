from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from ....records import TaskKind, TaskRecord, TaskStatus
from ....repositories import Repositories


@dataclass(frozen=True)
class PendingProjectClose:
    code: str
    project_id: str
    session_id: str
    agent_id: str | None
    task_id: str | None
    reason: str
    evidence_summary: str
    remaining_work_assessment: str


_PENDING_CLOSES: dict[str, PendingProjectClose] = {}


def create_pending_project_close(
    *,
    project_id: str,
    session_id: str,
    agent_id: str | None,
    task_id: str | None,
    reason: str,
    evidence_summary: str,
    remaining_work_assessment: str,
) -> PendingProjectClose:
    code = f"close_project_{uuid4().hex[:10]}"
    pending = PendingProjectClose(
        code=code,
        project_id=project_id,
        session_id=session_id,
        agent_id=agent_id,
        task_id=task_id,
        reason=reason,
        evidence_summary=evidence_summary,
        remaining_work_assessment=remaining_work_assessment,
    )
    _PENDING_CLOSES[code] = pending
    return pending


def pop_pending_project_close(code: str) -> PendingProjectClose | None:
    return _PENDING_CLOSES.pop(code, None)


def get_pending_project_close(code: str) -> PendingProjectClose | None:
    return _PENDING_CLOSES.get(code)


async def current_manager_plan_task(
    *,
    repos: Repositories,
    session_id: str,
    project_id: str,
    agent_id: str | None,
) -> TaskRecord | None:
    candidates = [
        task
        for task in await repos.tasks.list_for_project(project_id=project_id)
        if task.kind == TaskKind.PLAN
        and task.status == TaskStatus.IN_PROGRESS
        and task.claimed_in_session_id == session_id
        and (agent_id is None or task.assignee_id == agent_id)
    ]
    if not candidates:
        return None
    return sorted(candidates, key=lambda task: task.claimed_at or task.created_at)[-1]
