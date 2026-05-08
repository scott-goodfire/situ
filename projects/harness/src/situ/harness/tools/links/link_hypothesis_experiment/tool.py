from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import LinkHypothesisExperimentResult


class LinkHypothesisExperimentTool(
    BaseSituTool[SituToolDeps, LinkHypothesisExperimentResult]
):
    name = "link_hypothesis_experiment"
    result_type = LinkHypothesisExperimentResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        hypothesis_id: str,
        experiment_id: str,
        **_kwargs: Any,
    ) -> LinkHypothesisExperimentResult:
        """Link a hypothesis to an experiment."""
        link = await (await ctx.deps.get_repos()).hypothesis_experiment_links.create(
            hypothesis_id=hypothesis_id,
            experiment_id=experiment_id,
        )
        event = await ctx.deps.record_event(
            event_type="hypothesis.experiment_linked",
            message=f"Linked {hypothesis_id} to {experiment_id}",
            payload={"hypothesis_id": hypothesis_id, "experiment_id": experiment_id},
        )
        await ctx.deps.publish_record(record=link, event=event)
        return LinkHypothesisExperimentResult(success=True, link=link.model_dump())
