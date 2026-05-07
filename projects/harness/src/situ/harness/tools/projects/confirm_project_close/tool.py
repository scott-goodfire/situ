from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import ProjectStatus
from ...common import BaseSituTool, SituToolDeps
from .._shared.close_handshake import (
    current_manager_plan_task,
    get_pending_project_close,
    pop_pending_project_close,
)
from .models import ConfirmProjectCloseResult


class ConfirmProjectCloseTool(
    BaseSituTool[SituToolDeps, ConfirmProjectCloseResult]
):
    name = "confirm_project_close"
    result_type = ConfirmProjectCloseResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        confirmation_code: str,
        final_summary: str,
        **_kwargs: Any,
    ) -> ConfirmProjectCloseResult:
        """
        Confirm a prior project-close request with its short-lived code.

        The Manager should only call this after reconsidering whether another
        useful Scientist task can be filed.
        """
        repos = ctx.deps.get_repos()
        pending = get_pending_project_close(confirmation_code)
        if pending is None:
            return self._failure(
                code="project_close_confirmation_not_found",
                message=(
                    "No pending project close request matched that confirmation "
                    "code. Call `request_project_close` first, then retry with "
                    "the returned code if closing is still warranted."
                ),
            )
        if pending.session_id != ctx.deps.session_id:
            return self._failure(
                code="project_close_confirmation_session_mismatch",
                message="The confirmation code belongs to a different session.",
            )
        if ctx.deps.agent_id is not None and pending.agent_id != ctx.deps.agent_id:
            return self._failure(
                code="project_close_confirmation_agent_mismatch",
                message="The confirmation code belongs to a different agent.",
            )
        active_task = current_manager_plan_task(
            repos=repos,
            session_id=ctx.deps.session_id,
            project_id=pending.project_id,
            agent_id=ctx.deps.agent_id,
        )
        if pending.task_id is not None and (
            active_task is None or active_task.id != pending.task_id
        ):
            return self._failure(
                code="project_close_confirmation_expired",
                message=(
                    "The confirmation code is no longer attached to the active "
                    "planning task. Call `request_project_close` again if "
                    "closing is still warranted."
                ),
            )

        pop_pending_project_close(confirmation_code)
        project = repos.projects.update(project_id=pending.project_id, status=ProjectStatus.CLOSED)
        if project is None:
            raise ValueError(f"project not found: {pending.project_id}")

        event = ctx.deps.record_event(
            "project.closed",
            f"Closed project {project.id}: {final_summary}",
            payload={
                "project_id": project.id,
                "task_id": pending.task_id,
                "reason": pending.reason,
                "evidence_summary": pending.evidence_summary,
                "remaining_work_assessment": pending.remaining_work_assessment,
                "final_summary": final_summary,
            },
        )
        ctx.deps.publish_record(project, event=event)
        if pending.task_id is not None:
            activity = repos.task_activities.add(
                project_id=project.id,
                task_id=pending.task_id,
                created_in_session_id=ctx.deps.session_id,
                actor_agent_id=ctx.deps.agent_id,
                actor="manager",
                kind="comment",
                body=f"Confirmed project close. {final_summary}",
                payload={
                    "activity_type": "project_close_confirmed",
                    "project_id": project.id,
                },
            )
            ctx.deps.publish_record(activity, event=event)
        return ConfirmProjectCloseResult(
            success=True,
            project=project.model_dump(),
            message=(
                "Project closed. The active session runtime should now close "
                "instead of scheduling more planning work."
            ),
        )
