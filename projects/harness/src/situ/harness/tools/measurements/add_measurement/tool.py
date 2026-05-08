from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import AddMeasurementResult


class AddMeasurementTool(
    BaseSituTool[SituToolDeps, AddMeasurementResult]
):
    name = "add_measurement"
    result_type = AddMeasurementResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        evaluation_id: str,
        result: str,
        actor: str = "agent",
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddMeasurementResult:
        """Record one measurement under an evaluation.

        A measurement is one observed result for the evaluation's subject —
        a baseline run or a candidate experiment run. Pass the human-readable
        text in `result` and structured fields in `payload`. Metric payloads
        may use shorthand values, but are normalized to typed metric value
        objects shaped like `{"score": {"value": 0.73, "direction":
        "higher_is_better"}}`. Use `comparison_baseline_id` /
        `comparison_measurement_id` in the payload when comparing a candidate
        run to a specific baseline measurement.

        The `result` field is voice-bearing prose. Write full sentences
        around the data, with raw numbers and units inline, before/after
        in arrow notation, named configs. Tabular metric blocks are fine
        when they're actual data. Basic Markdown works in `result`; use
        emphasis, inline code, bullets, fenced output snippets, or small tables
        when that makes the evidence easier to read.

        <example field="result">
        val_bpb went from 2.713 to 2.687 (-0.026, ~1% relative).

        I used the same train/eval setup as M1 with seed 42 and 100k
        steps. The loss curve is in ART9 — it diverged from baseline
        around step 35k and stayed below for the rest of training, with
        no NaNs and no spikes that I noticed. Wall-clock was 41 minutes
        against the baseline's 38.
        </example>

        <example field="result">
        I ran EV1's cold-start track 100 times. The handshake-only and
        full-request percentiles came out as:

        p50 handshake: 32ms
        p99 handshake: 47ms
        p50 total: 38ms
        p99 total: 53ms

        The tail is dominated by TLS — these are cold connections only,
        and warm-connection p99 was 6ms in the same session. Reproducer
        is ./scripts/eval cold --runs 100, saved as artifact ART4.
        </example>

        <example field="result">
        The run failed at batch 47 with an OOM. CUDA reported 7.8GB
        allocated of 8GB available, and although the eval batch size is
        only 32, the train cache stays held alongside it. I bumped my
        local cache cap to 16GB and I'm rerunning now.

        I'm not recording this as evidence for or against H3 since it
        was a partial run.
        </example>
        """
        result_payload = {
            "activity_type": "result",
            "measurement_type": "result",
            **(payload or {}),
        }
        repos = await ctx.deps.get_repos()
        measurement = await repos.measurements.add(
            evaluation_id=evaluation_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            body=result,
            payload=result_payload,
        )
        event = await ctx.deps.record_event(
            event_type="measurement.added",
            message=result,
            payload={
                "measurement_id": measurement.id,
                "evaluation_id": evaluation_id,
            },
        )
        await ctx.deps.publish_record(record=measurement, event=event)
        return AddMeasurementResult(
            success=True,
            measurement=measurement.model_dump(),
        )
