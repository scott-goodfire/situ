from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import BaseSituTool, SituToolDeps
from .models import SearchEvaluationsResult


class SearchEvaluationsTool(BaseSituTool[SituToolDeps, SearchEvaluationsResult]):
    name = "search_evaluations"
    result_type = SearchEvaluationsResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        query: str,
        limit: int = 20,
        status: RecordStatus | None = None,
        **_kwargs: Any,
    ) -> SearchEvaluationsResult:
        """Full-text search evaluations in the current project.

        Pass natural-language keywords as ``query``. Results are ranked by
        relevance (BM25) and each row includes a ``snippet`` highlighting the
        matched terms with brackets. Always scoped to the current project;
        no cross-project access. Append ``*`` to a token for prefix matching.

        Args:
            query: Keywords or quoted phrases to search for.
            limit: Maximum results to return.
            status: Optional filter to a single work status.
        """
        repos = await ctx.deps.get_repos()
        project_id = await ctx.deps.require_project_id()
        hits = await repos.evaluations.search(
            project_id=project_id, query=query, limit=limit, status=status
        )
        return SearchEvaluationsResult(
            success=True,
            evaluations=[
                {**record.model_dump(), "snippet": snippet}
                for record, snippet in hits
            ],
        )
