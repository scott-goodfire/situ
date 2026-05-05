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

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        hypothesis_id: str,
        experiment_id: str,
        **_kwargs: Any,
    ) -> LinkHypothesisExperimentResult:
        """Link a hypothesis to an experiment."""
        link = ctx.deps.get_repos().hypothesis_experiment_links.create(
            hypothesis_id=hypothesis_id,
            experiment_id=experiment_id,
        )
        event = ctx.deps.record_event(
            "hypothesis.experiment_linked",
            f"Linked {hypothesis_id} to {experiment_id}",
            payload={"hypothesis_id": hypothesis_id, "experiment_id": experiment_id},
        )
        ctx.deps.publish_record(link, event=event)
        return LinkHypothesisExperimentResult(success=True, link=link.model_dump())
