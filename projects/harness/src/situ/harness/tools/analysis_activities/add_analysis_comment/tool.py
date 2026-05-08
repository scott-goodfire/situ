from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import AddAnalysisCommentResult


class AddAnalysisCommentTool(
    BaseSituTool[SituToolDeps, AddAnalysisCommentResult]
):
    name = "add_analysis_comment"
    result_type = AddAnalysisCommentResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        analysis_id: str,
        comment: str,
        actor: str = "agent",
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddAnalysisCommentResult:
        """Add a comment to an analysis activity trail.

        Comments on analyses read like senior engineer review remarks on
        a synthesis or codebase notes: full sentences, first-person where
        natural, willing to be skeptical, citing IDs inline. One paragraph
        in most cases. Basic Markdown works in `comment`; use it for emphasis,
        inline code, bullets, or a small table when that makes the remark
        easier to read.

        <example field="comment">
        I'd extend this analysis to also cover the EV4 timeout path. The
        current draft only walks through EV1, but the same handshake-cost
        pattern showed up in M11 against EV4 and is part of the same
        picture.
        </example>

        <example field="comment">
        I don't think this analysis accounts for the data refresh in PR
        #423. The conclusion that EX5 regressed leans on M14, but M14
        was recorded after the refresh — the regression is probably the
        data, not the component. Worth revising before someone uses this
        as the basis for closing H3.
        </example>

        <example field="comment">
        Worth superseding this once H4 closes. The architectural
        assumption it leans on (that the embedding matrix is stable
        after step 5k) doesn't hold under the EX7 data, and the rest of
        the analysis follows from that assumption.
        </example>
        """
        activity = await (await ctx.deps.get_repos()).analysis_activities.add(
            analysis_id=analysis_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="comment",
            body=comment,
            payload=payload or {},
        )
        event = await ctx.deps.record_event(
            event_type="analysis.comment_added",
            message=comment,
            payload={"activity_id": activity.id, "analysis_id": analysis_id},
        )
        await ctx.deps.publish_record(record=activity, event=event)
        return AddAnalysisCommentResult(success=True, activity=activity.model_dump())
