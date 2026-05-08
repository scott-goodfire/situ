from __future__ import annotations

import asyncio
from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import SearchEverythingResult


class SearchEverythingTool(BaseSituTool[SituToolDeps, SearchEverythingResult]):
    name = "search_everything"
    result_type = SearchEverythingResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        query: str,
        per_kind_limit: int = 5,
        **_kwargs: Any,
    ) -> SearchEverythingResult:
        """Triage search across every record and activity in the current project.

        Runs full-text search in parallel across analyses, hypotheses,
        experiments, baselines, evaluations, measurements, tasks, and activity
        timelines. Results are grouped by kind so the agent can
        scan which buckets matched. Each hit includes a ``snippet`` with
        matched terms wrapped in brackets, ranked by BM25 within its bucket.

        Always scoped to the current project; no cross-project access. Use
        this as the first step when triaging "is there anything in this
        project about X?", then drill into specific records with
        ``get_*`` or the per-entity ``search_*`` tools.

        Each activity hit carries an ``activity_kind`` discriminator
        (``analysis_activity``, ``hypothesis_activity``,
        ``baseline_activity``, ``experiment_activity``,
        ``evaluation_activity``, ``task_activity``) so the agent can route to
        the right ``list_*_activities``, comment, or transition tool.

        Args:
            query: Keywords or quoted phrases to search for. Append ``*`` to
                a token for prefix matching.
            per_kind_limit: Maximum hits per bucket (default 5).
        """
        repos = await ctx.deps.get_repos()
        project_id = await ctx.deps.require_project_id()

        (
            analyses,
            hypotheses,
            experiments,
            baselines,
            evaluations,
            measurements,
            tasks,
            analysis_act,
            hypothesis_act,
            baseline_act,
            experiment_act,
            evaluation_act,
            task_act,
        ) = await asyncio.gather(
            repos.analyses.search(
                project_id=project_id, query=query, limit=per_kind_limit
            ),
            repos.hypotheses.search(
                project_id=project_id, query=query, limit=per_kind_limit
            ),
            repos.experiments.search(
                project_id=project_id, query=query, limit=per_kind_limit
            ),
            repos.baselines.search(
                project_id=project_id, query=query, limit=per_kind_limit
            ),
            repos.evaluations.search(
                project_id=project_id, query=query, limit=per_kind_limit
            ),
            repos.measurements.search(
                project_id=project_id, query=query, limit=per_kind_limit
            ),
            repos.tasks.search(
                project_id=project_id, query=query, limit=per_kind_limit
            ),
            repos.analysis_activities.search(
                project_id=project_id, query=query, limit=per_kind_limit
            ),
            repos.hypothesis_activities.search(
                project_id=project_id, query=query, limit=per_kind_limit
            ),
            repos.baseline_activities.search(
                project_id=project_id, query=query, limit=per_kind_limit
            ),
            repos.experiment_activities.search(
                project_id=project_id, query=query, limit=per_kind_limit
            ),
            repos.evaluation_activities.search(
                project_id=project_id, query=query, limit=per_kind_limit
            ),
            repos.task_activities.search(
                project_id=project_id, query=query, limit=per_kind_limit
            ),
        )

        activities: list[dict[str, Any]] = []
        for activity_kind, hits in (
            ("analysis_activity", analysis_act),
            ("hypothesis_activity", hypothesis_act),
            ("baseline_activity", baseline_act),
            ("experiment_activity", experiment_act),
            ("evaluation_activity", evaluation_act),
            ("task_activity", task_act),
        ):
            for record, snippet in hits:
                activities.append(
                    {
                        "activity_kind": activity_kind,
                        **record.model_dump(),
                        "snippet": snippet,
                    }
                )

        result = SearchEverythingResult(
            success=True,
            analyses=[{**r.model_dump(), "snippet": s} for r, s in analyses],
            hypotheses=[{**r.model_dump(), "snippet": s} for r, s in hypotheses],
            experiments=[{**r.model_dump(), "snippet": s} for r, s in experiments],
            baselines=[{**r.model_dump(), "snippet": s} for r, s in baselines],
            evaluations=[{**r.model_dump(), "snippet": s} for r, s in evaluations],
            measurements=[{**r.model_dump(), "snippet": s} for r, s in measurements],
            tasks=[{**r.model_dump(), "snippet": s} for r, s in tasks],
            activities=activities,
        )
        result.total_hits = (
            len(result.analyses)
            + len(result.hypotheses)
            + len(result.experiments)
            + len(result.baselines)
            + len(result.evaluations)
            + len(result.measurements)
            + len(result.tasks)
            + len(result.activities)
        )
        return result
