from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus, parse_record_status
from ...common import SituToolDeps, BaseSituTool
from .models import CreateHypothesisResult


class CreateHypothesisTool(BaseSituTool[SituToolDeps, CreateHypothesisResult]):
    name = "create_hypothesis"
    result_type = CreateHypothesisResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        summary: str,
        hypothesis_id: str | None = None,
        status: RecordStatus = RecordStatus.TRIAGE,
        **_kwargs: Any,
    ) -> CreateHypothesisResult:
        """Create a hypothesis under the current project.

        Title is the testable claim in one line. Summary is full prose that
        names the predicted mechanism and the evidence shape that would test
        it — write in complete sentences with first-person where natural,
        and cite specific record IDs inline. Basic Markdown works in `title`
        and `summary`; use emphasis, inline code, bullets, or a small table
        when it makes the claim easier to scan.

        Notes:
            Status `done` is rejected at create time. To close a
            hypothesis, use `resolve_hypothesis` so the activity trail
            records the resolution as supported, rejected, superseded, or
            inconclusive.

        <example field="title">
        TLS preconnect cuts cold-start p99 by ≥20ms.
        </example>
        <example field="summary">
        I'm proposing this because the handshake costs 30–40ms in every
        measurement we have (M3, M4, M7), and preconnecting on session
        start should remove most of that without changing the warm path.
        I'd test it against EV1's cold-start track. The preconnect cost
        itself is amortized across the session, so I don't expect it to
        show up in steady-state measurements.
        </example>

        <example field="title">
        The score plateau is data-bound, not model-bound.
        </example>
        <example field="summary">
        I think this is the case because three different model variants
        (EX5, EX7, EX8) all hit the same val_bpb floor of 2.71 within
        0.005 of each other. If it were a model issue I'd expect the
        variance across EX5–EX8 to be wider. The cleanest way to test it
        would be to retrain EX7 on a 2x deduplicated training set and see
        if the floor moves at all.
        </example>

        <example field="title">
        Components A and C compose, and the win looks roughly additive.
        </example>
        <example field="summary">
        A on its own is +0.024 over baseline (M2 vs M1), and C on its own
        is +0.038 (M12). When I ran them together in M19 I got +0.061,
        which is within noise of the two added together. If they were
        interfering with each other I'd expect destructive cancellation,
        and we don't. I think it's worth a fourth experiment with A+B+C
        to see whether the additivity holds when we stack three.
        </example>
        """
        try:
            checked_status = parse_record_status(status=status, noun="hypothesis")
        except ValueError as error:
            return self._failure(
                code="invalid_hypothesis_status",
                message=str(error),
            )
        if checked_status == RecordStatus.DONE:
            return self._failure(
                code="hypothesis_resolution_required",
                message=(
                    "Create hypotheses as open or active. To close a "
                    "hypothesis, use resolve_hypothesis so the activity trail "
                    "records supported, rejected, superseded, or inconclusive."
                ),
            )
        repos = await ctx.deps.get_repos()
        project_id = await ctx.deps.require_project_id()
        session_id = ctx.deps.session_id
        resolved_hypothesis_id = hypothesis_id or await repos.hypotheses.next_id(
            project_id=project_id,
        )
        hypothesis = await repos.hypotheses.create(
            hypothesis_id=resolved_hypothesis_id,
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            summary=summary,
            status=checked_status,
        )
        event = await ctx.deps.record_event(
            event_type="hypothesis.created",
            message=f"Created hypothesis {hypothesis.id}",
            payload={"hypothesis_id": hypothesis.id},
        )
        await ctx.deps.publish_record(record=hypothesis, event=event)
        return CreateHypothesisResult(success=True, hypothesis=hypothesis.model_dump())
