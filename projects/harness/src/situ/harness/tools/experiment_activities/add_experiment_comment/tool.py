from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import AddExperimentCommentResult


class AddExperimentCommentTool(
    BaseSituTool[SituToolDeps, AddExperimentCommentResult]
):
    name = "add_experiment_comment"
    result_type = AddExperimentCommentResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str,
        comment: str,
        actor: str = "agent",
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddExperimentCommentResult:
        """Add a comment to an experiment activity trail.

        Comments on experiments read like remarks on a candidate change:
        full sentences, first-person where natural, focused on what the
        run produced, what changed, what's risky, or what should be tried
        next. One paragraph in most cases. Basic Markdown works in `comment`;
        use it for emphasis, inline code, bullets, or a small table when that
        makes the candidate easier to understand.

        <example field="comment">
        I figured out what was happening with M9. The error wasn't from
        the model — the eval harness OOMed at batch 47 because we'd
        left the cache at 8GB. I bumped my local cap to 16GB and it ran
        clean. I'm putting that in the eval setup notes so the next
        session doesn't trip on it.
        </example>

        <example field="comment">
        EX5 is a clean reproduction of EX2's setup with one change (the
        component-A placement moved from step 0 to step 500). I'd treat
        its result as direct evidence on H1 rather than just a follow-up
        — the design isolates the variable we care about.
        </example>

        <example field="comment">
        I'd hold off counting EX9's result until we resolve the seed
        issue. M19 used a non-canonical seed and the +0.018 lift might
        just be seed noise from the spread we saw in baseline runs. I'm
        rerunning with the canonical seed list before this becomes
        evidence for H3.
        </example>
        """
        activity = await (await ctx.deps.get_repos()).experiment_activities.add(
            experiment_id=experiment_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="comment",
            body=comment,
            payload=payload or {},
        )
        event = await ctx.deps.record_event(
            event_type="experiment.comment_added",
            message=comment,
            payload={"activity_id": activity.id, "experiment_id": experiment_id},
        )
        await ctx.deps.publish_record(record=activity, event=event)
        return AddExperimentCommentResult(success=True, activity=activity.model_dump())
