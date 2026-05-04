from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

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
        snapshot = ctx.deps.repos.snapshots.get()
        run = ctx.deps.repos.runs.get(ctx.deps.run_id)
        run_id = ctx.deps.run_id
        return GetRunContextResult(
            success=True,
            config=snapshot["config"],
            run=run,
            recent_experiments=[
                item for item in snapshot["experiments"] if item["run_id"] == run_id
            ][-10:],
            recent_evidence=[
                item for item in snapshot["evidence"] if item["run_id"] == run_id
            ][-10:],
            recent_findings=[
                item for item in snapshot["findings"] if item["run_id"] == run_id
            ][-10:],
            recent_warnings=[
                item for item in snapshot["warnings"] if item["run_id"] == run_id
            ][-10:],
        )
