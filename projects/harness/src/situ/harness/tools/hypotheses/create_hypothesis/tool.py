from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus
from ...common import SituToolDeps, BaseSituTool
from .models import CreateHypothesisResult


class CreateHypothesisTool(BaseSituTool[SituToolDeps, CreateHypothesisResult]):
    name = "create_hypothesis"
    result_type = CreateHypothesisResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        summary: str,
        hypothesis_id: str | None = None,
        status: WorkStatus = WorkStatus.OPEN,
        **_kwargs: Any,
    ) -> CreateHypothesisResult:
        """Create a hypothesis under the current project.

        `status` must be `open`, `active`, or `closed`.
        """
        repos = ctx.deps.get_repos()
        project_id = ctx.deps.require_project_id()
        session_id = ctx.deps.session_id
        resolved_hypothesis_id = hypothesis_id or _next_hypothesis_id(
            repos=repos,
            project_id=project_id,
        )
        hypothesis = repos.hypotheses.create(
            hypothesis_id=resolved_hypothesis_id,
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            summary=summary,
            status=status,
        )
        event = ctx.deps.record_event(
            "hypothesis.created",
            f"Created hypothesis {hypothesis.id}",
            payload={"hypothesis_id": hypothesis.id},
        )
        ctx.deps.publish_record(hypothesis, event=event)
        return CreateHypothesisResult(success=True, hypothesis=hypothesis.model_dump())


def _next_hypothesis_id(
    *,
    repos: Any,
    project_id: str,
) -> str:
    count = len(repos.hypotheses.list_for_project(project_id=project_id)) + 1
    return f"hyp_{project_id}_agent_{count:03d}"
