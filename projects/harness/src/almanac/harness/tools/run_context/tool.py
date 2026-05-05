from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...api.run_context import RunContextService
from ..common import AlmanacToolDeps, BaseAlmanacTool
from .models import GetRunContextResult


class GetRunContextTool(BaseAlmanacTool[AlmanacToolDeps, GetRunContextResult]):
    name = "get_run_context"
    result_type = GetRunContextResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        **_kwargs: Any,
    ) -> GetRunContextResult:
        run_context = RunContextService(repos=ctx.deps.repos).get(ctx.deps.run_id)
        return GetRunContextResult(
            success=True,
            config=run_context.config.model_dump() if run_context.config is not None else None,
            run=run_context.run.model_dump() if run_context.run is not None else None,
            recent_experiments=[
                experiment.model_dump() for experiment in run_context.recent_experiments
            ],
            recent_evidence=[evidence.model_dump() for evidence in run_context.recent_evidence],
            recent_findings=[finding.model_dump() for finding in run_context.recent_findings],
            recent_warnings=[warning.model_dump() for warning in run_context.recent_warnings],
        )
