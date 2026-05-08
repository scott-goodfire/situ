from __future__ import annotations

from typing import Any, Literal

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import AddExperimentLineageDecisionResult

LineageDecision = Literal["continue", "fork", "reproduce", "abandon", "reject"]


class AddExperimentLineageDecisionTool(
    BaseSituTool[SituToolDeps, AddExperimentLineageDecisionResult]
):
    name = "add_experiment_lineage_decision"
    result_type = AddExperimentLineageDecisionResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str,
        decision: LineageDecision,
        reason: str,
        research_thread: str | None = None,
        parent_experiment_id: str | None = None,
        base_commit: str | None = None,
        candidate_commit: str | None = None,
        actor: str = "manager",
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddExperimentLineageDecisionResult:
        """Record the Manager's portfolio decision for a reviewed experiment.

        Notes:
            Omitting `parent_experiment_id`, `base_commit`, or
            `candidate_commit` inherits the experiment's current values;
            pass them explicitly only to override. If `parent_experiment_id`
            is provided it must refer to a different experiment in the
            same project. The decision is recorded as an activity payload
            with `record_type: lineage_decision`. For `decision="continue"` on
            a usable reviewed candidate, the follow-up experiment task should
            usually use `base_selector="parent_experiment"` with this
            experiment as `parent_experiment_id` so patches can compound.
        """
        repos = await ctx.deps.get_repos()
        experiment = await repos.experiments.get(experiment_id=experiment_id)
        if experiment is None:
            return self._failure(
                code="experiment_not_found",
                message=f"experiment not found: {experiment_id}",
            )

        resolved_parent_experiment_id = (
            parent_experiment_id or experiment.parent_experiment_id
        )
        if resolved_parent_experiment_id is not None:
            parent = await repos.experiments.get(
                experiment_id=resolved_parent_experiment_id
            )
            if parent is None or parent.project_id != experiment.project_id:
                return self._failure(
                    code="invalid_parent_experiment",
                    message=(
                        "parent_experiment_id must refer to an experiment in "
                        f"the same project: {resolved_parent_experiment_id}"
                    ),
                )

        decision_payload = {
            "record_type": "lineage_decision",
            "decision": decision,
            "research_thread": research_thread or experiment.research_thread,
            "parent_experiment_id": resolved_parent_experiment_id,
            "base_commit": base_commit or experiment.base_commit,
            "candidate_commit": candidate_commit or experiment.candidate_commit,
            **(payload or {}),
        }
        activity = await repos.experiment_activities.add(
            experiment_id=experiment_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="recorded",
            body=reason,
            payload=decision_payload,
        )
        event = await ctx.deps.record_event(
            event_type="experiment.lineage_decision_added",
            message=reason,
            payload={
                "activity_id": activity.id,
                "experiment_id": experiment_id,
                "decision": decision,
                "research_thread": decision_payload["research_thread"],
                "parent_experiment_id": decision_payload["parent_experiment_id"],
                "base_commit": decision_payload["base_commit"],
                "candidate_commit": decision_payload["candidate_commit"],
            },
        )
        await ctx.deps.publish_record(record=activity, event=event)
        return AddExperimentLineageDecisionResult(
            success=True,
            activity=activity.model_dump(),
        )
