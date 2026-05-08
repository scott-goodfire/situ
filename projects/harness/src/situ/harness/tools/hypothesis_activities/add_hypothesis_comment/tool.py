from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import AddHypothesisCommentResult


class AddHypothesisCommentTool(
    BaseSituTool[SituToolDeps, AddHypothesisCommentResult]
):
    name = "add_hypothesis_comment"
    result_type = AddHypothesisCommentResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        hypothesis_id: str,
        comment: str,
        actor: str = "agent",
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddHypothesisCommentResult:
        """Add a comment to a hypothesis activity trail.

        Comments on hypotheses read like remarks on a proposed claim: full
        sentences, first-person where natural, focused on whether the
        hypothesis is testable, well-scoped, or supported by current
        evidence. One paragraph in most cases. Basic Markdown works in
        `comment`; use it for emphasis, inline code, bullets, or a small table
        when that makes the judgment easier to scan.

        <example field="comment">
        I don't think EX6 actually tests H4. It changes the optimizer at
        the same time as the dropout setting, and we can't separate which
        one is responsible for the result. I'd either split it into two
        experiments — one isolating the optimizer change, one isolating
        dropout — or update H4 to bundle them as a single intervention.
        </example>

        <example field="comment">
        This hypothesis as written doesn't have a falsifier. What
        measurement would tell us it's wrong? Without that the Scientist
        can't design an experiment that actually probes it. I'd narrow
        the claim to something like "preconnect cuts p99 by ≥20ms" so
        we can read EV1 against it directly.
        </example>

        <example field="comment">
        I'd narrow this hypothesis to just the cold-path. The warm-path
        claim doesn't have evidence behind it — every measurement we
        have on warm connections (M3, M4, M7) is already at 6ms total,
        so there's no room to improve there. Closing the warm-path part
        as inconclusive and keeping the cold-path part open seems right.
        </example>
        """
        activity = await (await ctx.deps.get_repos()).hypothesis_activities.add(
            hypothesis_id=hypothesis_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="comment",
            body=comment,
            payload=payload or {},
        )
        event = await ctx.deps.record_event(
            event_type="hypothesis.comment_added",
            message=comment,
            payload={"activity_id": activity.id, "hypothesis_id": hypothesis_id},
        )
        await ctx.deps.publish_record(record=activity, event=event)
        return AddHypothesisCommentResult(success=True, activity=activity.model_dump())
