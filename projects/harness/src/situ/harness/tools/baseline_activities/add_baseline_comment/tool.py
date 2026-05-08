from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import AddBaselineCommentResult


class AddBaselineCommentTool(
    BaseSituTool[SituToolDeps, AddBaselineCommentResult]
):
    name = "add_baseline_comment"
    result_type = AddBaselineCommentResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        baseline_id: str,
        comment: str,
        actor: str = "agent",
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddBaselineCommentResult:
        """Add a comment to a baseline activity trail.

        Comments on baselines read like remarks on reference evidence:
        full sentences, first-person where natural, focused on what the
        baseline measured, whether it is comparable, and what future
        candidate measurements should preserve. One paragraph in most cases.
        Basic Markdown works in `comment`; use it for emphasis, inline code,
        bullets, or a small table when that makes the comparison easier to
        scan.

        <example field="comment">
        This baseline is useful for score comparisons, but not latency. The
        measurement captured the canonical eval command and seed list, while
        the latency path ran under debug logging. I'd reuse the score metrics
        from B2 and file a separate latency baseline before treating p95 as a
        comparable signal.
        </example>

        <example field="comment">
        I trust B4 as the reference for the cold-path experiments. EV7 and
        EV8 used the same fixture set and their score spread is only 0.002, so
        future candidate runs can cite those measurements directly instead of
        rerunning the whole baseline.
        </example>

        <example field="comment">
        I would not use this baseline for the current thread. The dependency
        lockfile changed before M12 was recorded, so the candidate runs after
        EX6 are comparing against a different environment than the original
        reference.
        </example>
        """
        repos = await ctx.deps.get_repos()
        activity = await repos.baseline_activities.add(
            baseline_id=baseline_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="comment",
            body=comment,
            payload=payload or {},
        )
        event = await ctx.deps.record_event(
            event_type="baseline.comment_added",
            message=comment,
            payload={"activity_id": activity.id, "baseline_id": baseline_id},
        )
        await ctx.deps.publish_record(record=activity, event=event)
        return AddBaselineCommentResult(success=True, activity=activity.model_dump())
