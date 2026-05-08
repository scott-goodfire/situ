from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import BaseSituTool, SituToolDeps
from .models import CreateAnalysisResult


class CreateAnalysisTool(BaseSituTool[SituToolDeps, CreateAnalysisResult]):
    name = "create_analysis"
    result_type = CreateAnalysisResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        summary: str,
        content: str,
        status: RecordStatus = RecordStatus.TRIAGE,
        analysis_id: str | None = None,
        supersedes_analysis_id: str | None = None,
        **_kwargs: Any,
    ) -> CreateAnalysisResult:
        """Create durable project understanding before it becomes a hypothesis.

        The `content` field is voice-bearing prose that humans will read
        alongside other agents' analyses. Write in complete sentences with
        first-person pronouns where natural. Lead with the finding, cite
        specific record IDs (Mn, Hn, EXn, EVn) inline, and name what the data
        showed. Basic Markdown works in `title`, `summary`, and `content`:
        use bold, italic, inline code, bullets, and small tables when they make
        the analysis easier to scan.

        <example field="content">
        I'm closing H2 ("dropout helps") as inconclusive. We tested
        dropout at 0.1, 0.2, and 0.3 in EX3, EX6, and EX9, and all three
        came in within ±0.005 of baseline (M5, M8, M11). The effect size
        we'd need to call this a real win is larger than the eval's
        measurement noise, so the data we have can't support the
        hypothesis either way.
        </example>

        <example field="content">
        I'm pretty sure the score drop on EX5 isn't from the new component
        — it's from the eval data refresh that landed two commits before.
        When I reverted just the data refresh on the same EX5 commit, the
        score recovered to 0.741 against a baseline of 0.738 (M14). The
        component change in EX5 is either neutral or a small win, but I
        can't tell which through the noise yet.

        I think H3 needs to be re-tested against the refreshed data once
        we have a new baseline established on it. The old M1 baseline
        number doesn't apply anymore.
        </example>

        <example field="content">
        The cold-start tail is dominated by the TLS handshake. I traced
        six runs of EV1 against the production reproducer and the
        handshake accounted for 38–42ms in every one (M3, M4, M7), while
        the rest of the request was 4ms once the connection was warm.

        We had been treating this as a model-loading problem, but it
        isn't. The warm-loaded model serves the same request shape in
        6ms total, so the 30ms+ gap has to be on the network side. EX2's
        preconnect attempt in M9 closed it down to 11ms with no model
        change.
        </example>
        """
        repos = await ctx.deps.get_repos()
        project_id = await ctx.deps.require_project_id()
        resolved_analysis_id = analysis_id or await repos.analyses.next_id(
            project_id=project_id,
        )
        analysis = await repos.analyses.create(
            analysis_id=resolved_analysis_id,
            project_id=project_id,
            created_in_session_id=ctx.deps.session_id,
            created_by_agent_id=ctx.deps.agent_id,
            status=status,
            title=title,
            summary=summary,
            content=content,
            supersedes_analysis_id=supersedes_analysis_id,
        )
        event = await ctx.deps.record_event(
            event_type="analysis.created",
            message=f"Created analysis {analysis.id}",
            payload={"analysis_id": analysis.id},
        )
        await ctx.deps.publish_record(record=analysis, event=event)
        return CreateAnalysisResult(success=True, analysis=analysis.model_dump())
