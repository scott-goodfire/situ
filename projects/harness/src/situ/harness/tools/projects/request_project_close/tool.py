from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .._shared.close_handshake import (
    create_pending_project_close,
    current_manager_plan_task,
)
from .models import RequestProjectCloseResult


class RequestProjectCloseTool(
    BaseSituTool[SituToolDeps, RequestProjectCloseResult]
):
    name = "request_project_close"
    result_type = RequestProjectCloseResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        reason: str,
        evidence_summary: str,
        remaining_work_assessment: str,
        project_id: str | None = None,
        **_kwargs: Any,
    ) -> RequestProjectCloseResult:
        """
        Request permission to close the current project.

        This never closes the project directly. It returns a short-lived
        confirmation code and a warning to keep going unless closing is still
        clearly warranted.
        """
        repos = ctx.deps.get_repos()
        resolved_project_id = project_id or ctx.deps.require_project_id()
        project = repos.projects.get(project_id=resolved_project_id)
        if project is None:
            raise ValueError(f"project not found: {resolved_project_id}")

        active_task = current_manager_plan_task(
            repos=repos,
            session_id=ctx.deps.session_id,
            project_id=project.id,
            agent_id=ctx.deps.agent_id,
        )
        pending = create_pending_project_close(
            project_id=project.id,
            session_id=ctx.deps.session_id,
            agent_id=ctx.deps.agent_id,
            task_id=active_task.id if active_task is not None else None,
            reason=reason,
            evidence_summary=evidence_summary,
            remaining_work_assessment=remaining_work_assessment,
        )
        message = (
            "Project close requires confirmation. Experiment budget or useful "
            "work may remain; try to keep going unless you are confident no "
            "useful next Scientist task exists. If you are still sure, call "
            "`confirm_project_close` with the confirmation code from this "
            "result."
        )
        event = ctx.deps.record_event(
            event_type="project.close_confirmation_required",
            message=message,
            payload={
                "project_id": project.id,
                "task_id": active_task.id if active_task is not None else None,
                "reason": reason,
                "evidence_summary": evidence_summary,
                "remaining_work_assessment": remaining_work_assessment,
            },
        )
        if active_task is not None:
            activity = repos.task_activities.add(
                project_id=project.id,
                task_id=active_task.id,
                created_in_session_id=ctx.deps.session_id,
                actor_agent_id=ctx.deps.agent_id,
                actor="manager",
                kind="comment",
                body=(
                    "Requested project close confirmation. "
                    f"Reason: {reason} "
                    f"Remaining work assessment: {remaining_work_assessment}"
                ),
                payload={
                    "activity_type": "project_close_requested",
                    "project_id": project.id,
                },
            )
            ctx.deps.publish_record(record=activity, event=event)
        return RequestProjectCloseResult(
            success=True,
            confirmation_required=True,
            confirmation_code=pending.code,
            project=project.model_dump(),
            message=message,
        )
