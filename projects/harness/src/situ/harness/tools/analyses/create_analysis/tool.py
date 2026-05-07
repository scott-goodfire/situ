from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus
from ...common import BaseSituTool, SituToolDeps
from .models import CreateAnalysisResult


class CreateAnalysisTool(BaseSituTool[SituToolDeps, CreateAnalysisResult]):
    name = "create_analysis"
    result_type = CreateAnalysisResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        summary: str,
        content: str,
        status: WorkStatus = WorkStatus.OPEN,
        analysis_id: str | None = None,
        supersedes_analysis_id: str | None = None,
        **_kwargs: Any,
    ) -> CreateAnalysisResult:
        """Create durable project understanding before it becomes a hypothesis."""
        repos = ctx.deps.get_repos()
        project_id = ctx.deps.require_project_id()
        resolved_analysis_id = analysis_id or repos.analyses.next_id(
            project_id=project_id,
        )
        analysis = repos.analyses.create(
            analysis_id=resolved_analysis_id,
            project_id=project_id,
            created_in_session_id=ctx.deps.session_id,
            created_by_agent_id=ctx.deps.agent_id,
            status=status,
            title=title,
            summary=summary,
            content=content,
            supersedes_analysis_id=supersedes_analysis_id,
        )
        event = ctx.deps.record_event(
            event_type="analysis.created",
            message=f"Created analysis {analysis.id}",
            payload={"analysis_id": analysis.id},
        )
        ctx.deps.publish_record(record=analysis, event=event)
        return CreateAnalysisResult(success=True, analysis=analysis.model_dump())
