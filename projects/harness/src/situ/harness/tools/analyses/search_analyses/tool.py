from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import BaseSituTool, SituToolDeps
from .models import SearchAnalysesResult


class SearchAnalysesTool(BaseSituTool[SituToolDeps, SearchAnalysesResult]):
    name = "search_analyses"
    result_type = SearchAnalysesResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        query: str,
        limit: int = 20,
        status: RecordStatus | None = None,
        **_kwargs: Any,
    ) -> SearchAnalysesResult:
        """Full-text search analyses in the current project.

        Pass natural-language keywords as ``query``. Results are ranked by
        relevance (BM25) and each row includes a ``snippet`` highlighting the
        matched terms with brackets. Always scoped to the current project;
        no cross-project access. Append ``*`` to a token for prefix matching
        (e.g. ``latenc*`` matches ``latency``, ``latencies``).

        Args:
            query: Keywords or quoted phrases to search for.
            limit: Maximum results to return.
            status: Optional filter to a single work status.
        """
        repos = await ctx.deps.get_repos()
        project_id = await ctx.deps.require_project_id()
        hits = await repos.analyses.search(
            project_id=project_id, query=query, limit=limit, status=status
        )
        return SearchAnalysesResult(
            success=True,
            analyses=[
                {**record.model_dump(), "snippet": snippet}
                for record, snippet in hits
            ],
        )
