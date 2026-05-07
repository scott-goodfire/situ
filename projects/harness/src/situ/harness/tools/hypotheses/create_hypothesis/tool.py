from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus, parse_work_status
from ...common import SituToolDeps, BaseSituTool
from .models import CreateHypothesisResult


class CreateHypothesisTool(BaseSituTool[SituToolDeps, CreateHypothesisResult]):
    name = "create_hypothesis"
    result_type = CreateHypothesisResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        summary: str,
        hypothesis_id: str | None = None,
        status: WorkStatus = WorkStatus.OPEN,
        **_kwargs: Any,
    ) -> CreateHypothesisResult:
        """Create a hypothesis under the current project."""
        try:
            checked_status = parse_work_status(status=status, noun="hypothesis")
        except ValueError as error:
            return self._failure(
                code="invalid_hypothesis_status",
                message=str(error),
            )
        if checked_status == WorkStatus.CLOSED:
            return self._failure(
                code="hypothesis_resolution_required",
                message=(
                    "Create hypotheses as open or active. To close a "
                    "hypothesis, use resolve_hypothesis so the activity trail "
                    "records supported, rejected, superseded, or inconclusive."
                ),
            )
        repos = ctx.deps.get_repos()
        project_id = ctx.deps.require_project_id()
        session_id = ctx.deps.session_id
        resolved_hypothesis_id = hypothesis_id or repos.hypotheses.next_id(
            project_id=project_id,
        )
        hypothesis = repos.hypotheses.create(
            hypothesis_id=resolved_hypothesis_id,
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            summary=summary,
            status=checked_status,
        )
        event = ctx.deps.record_event(
            event_type="hypothesis.created",
            message=f"Created hypothesis {hypothesis.id}",
            payload={"hypothesis_id": hypothesis.id},
        )
        ctx.deps.publish_record(record=hypothesis, event=event)
        return CreateHypothesisResult(success=True, hypothesis=hypothesis.model_dump())
