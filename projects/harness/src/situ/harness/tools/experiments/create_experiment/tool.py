from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus, TaskEntityKind
from ...common import SituToolDeps, BaseSituTool
from ...common.task_entity_links import link_active_task_entity
from .models import CreateExperimentResult


class CreateExperimentTool(BaseSituTool[SituToolDeps, CreateExperimentResult]):
    name = "create_experiment"
    result_type = CreateExperimentResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        summary: str,
        experiment_id: str | None = None,
        parent_experiment_id: str | None = None,
        research_thread: str | None = None,
        status: RecordStatus = RecordStatus.TRIAGE,
        **_kwargs: Any,
    ) -> CreateExperimentResult:
        """Create an experiment under the current project.

        Use a short human title and a summary that explains the candidate
        change, the hypothesis it tests, and the comparison that will matter.
        Basic Markdown works in `title` and `summary`; use emphasis, inline
        code, bullets, or a small table when it makes the candidate easier to
        scan.

        New experiments default to `triage` status. Use the dedicated
        transition tools (`accept_experiment`, `submit_experiment`,
        `complete_experiment`, `cancel_experiment`, `fail_experiment`)
        to move the experiment through review.

        Notes:
            If an experiment with `experiment_id` already exists this acts
            as an upsert: title, summary, parent, and research_thread are
            updated. An existing `active` experiment is not regressed back
            to `triage` if the call leaves `status` at the default;
            explicitly pass `status=triage` to force the regression.
        """
        repos = await ctx.deps.get_repos()
        project_id = await ctx.deps.require_project_id()
        session_id = ctx.deps.session_id
        resolved_experiment_id = (
            experiment_id
            or ctx.deps.active_experiment_id
            or await repos.experiments.next_id(project_id=project_id)
        )
        existing = await repos.experiments.get(experiment_id=resolved_experiment_id)
        if existing is not None and experiment_id is None:
            next_status = (
                existing.status
                if existing.status == RecordStatus.ACTIVE and status == RecordStatus.TRIAGE
                else status
            )
            experiment = (
                await repos.experiments.update(
                    experiment_id=resolved_experiment_id,
                    title=title,
                    summary=summary,
                    status=next_status,
                    parent_experiment_id=parent_experiment_id,
                    research_thread=research_thread,
                )
                or existing
            )
            event = await ctx.deps.record_event(
                event_type="experiment.updated",
                message=f"Updated experiment {experiment.id}",
                payload={"experiment_id": experiment.id},
            )
            await ctx.deps.publish_record(record=experiment, event=event)
            await link_active_task_entity(
                ctx=ctx,
                entity_kind=TaskEntityKind.EXPERIMENT,
                entity_id=experiment.id,
                relationship="created",
            )
            return CreateExperimentResult(
                success=True,
                experiment=experiment.model_dump(),
            )

        if existing is not None:
            raise ValueError(f"experiment already exists: {resolved_experiment_id}")

        experiment = await repos.experiments.create(
            experiment_id=resolved_experiment_id,
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            summary=summary,
            status=status,
            parent_experiment_id=parent_experiment_id,
            research_thread=research_thread,
        )
        event = await ctx.deps.record_event(
            event_type="experiment.created",
            message=f"Created experiment {experiment.id}",
            payload={"experiment_id": experiment.id},
        )
        await ctx.deps.publish_record(record=experiment, event=event)
        await link_active_task_entity(
            ctx=ctx,
            entity_kind=TaskEntityKind.EXPERIMENT,
            entity_id=experiment.id,
            relationship="created",
        )
        return CreateExperimentResult(success=True, experiment=experiment.model_dump())
