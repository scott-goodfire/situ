from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus
from ...common import BaseSituTool, SituToolDeps
from .models import CreateBaselineResult


class CreateBaselineTool(BaseSituTool[SituToolDeps, CreateBaselineResult]):
    name = "create_baseline"
    result_type = CreateBaselineResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        summary: str,
        baseline_id: str | None = None,
        status: WorkStatus = WorkStatus.OPEN,
        **_kwargs: Any,
    ) -> CreateBaselineResult:
        """Create a reference condition that future evaluations can measure."""
        repos = ctx.deps.get_repos()
        project_id = ctx.deps.require_project_id()
        session_id = ctx.deps.session_id
        resolved_baseline_id = baseline_id or _next_baseline_id(
            repos=repos,
            project_id=project_id,
        )
        baseline = repos.baselines.create(
            baseline_id=resolved_baseline_id,
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            summary=summary,
            status=status,
        )
        event = ctx.deps.record_event(
            event_type="baseline.created",
            message=f"Created baseline {baseline.id}",
            payload={"baseline_id": baseline.id},
        )
        ctx.deps.publish_record(record=baseline, event=event)
        return CreateBaselineResult(success=True, baseline=baseline.model_dump())


def _next_baseline_id(
    *,
    repos: Any,
    project_id: str,
) -> str:
    count = len(repos.baselines.list_for_project(project_id=project_id)) + 1
    return f"baseline_{project_id}_agent_{count:03d}"
