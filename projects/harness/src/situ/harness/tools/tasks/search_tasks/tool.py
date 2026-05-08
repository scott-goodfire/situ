from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import TaskKind, TaskStatus
from ...common import BaseSituTool, SituToolDeps
from .models import SearchTasksResult


class SearchTasksTool(BaseSituTool[SituToolDeps, SearchTasksResult]):
    name = "search_tasks"
    result_type = SearchTasksResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        query: str,
        limit: int = 20,
        status: TaskStatus | None = None,
        kind: TaskKind | None = None,
        **_kwargs: Any,
    ) -> SearchTasksResult:
        """Full-text search tasks in the current project.

        Pass natural-language keywords as ``query``. Results are ranked by
        relevance (BM25) and each row includes a ``snippet`` highlighting the
        matched terms with brackets. Always scoped to the current project;
        no cross-project access. Append ``*`` to a token for prefix matching.

        Args:
            query: Keywords or quoted phrases to search for.
            limit: Maximum results to return.
            status: Optional filter to a single task status.
            kind: Optional filter to a single task kind.
        """
        repos = await ctx.deps.get_repos()
        project_id = await ctx.deps.require_project_id()
        hits = await repos.tasks.search(
            project_id=project_id,
            query=query,
            limit=limit,
            status=status,
            kind=kind,
        )
        return SearchTasksResult(
            success=True,
            tasks=[
                {**record.model_dump(), "snippet": snippet}
                for record, snippet in hits
            ],
        )
