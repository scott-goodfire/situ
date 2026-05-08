from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import AddTaskCommentResult


class AddTaskCommentTool(BaseSituTool[SituToolDeps, AddTaskCommentResult]):
    name = "add_task_comment"
    result_type = AddTaskCommentResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        task_id: str,
        comment: str,
        actor: str = "agent",
        actor_agent_id: str | None = None,
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddTaskCommentResult:
        """Add a comment on a task activity timeline.

        Comments on tasks read like coordination remarks on a shared
        issue tracker: full sentences with explicit subjects, first-person
        where natural, present-tense, named action. One paragraph in most
        cases. Basic Markdown works in `comment`; use it for emphasis, inline
        code, bullets, or a small table when that makes the handoff easier to
        read.

        <example field="comment">
        I'm picking this up. My plan is to run the baseline first, then
        queue EX5 against the same eval to keep the comparison clean.
        I'll record both as measurements on EV1 with comparison notes so
        the delta is easy to read.
        </example>

        <example field="comment">
        I'm blocked on this. The eval reproducer fails on the v2 dataset
        and I need someone to triage that before I can proceed. I filed
        T31 to capture the dataset fix and I'll resume here once it
        lands.
        </example>

        <example field="comment">
        I'm pausing this until the Critic review on EX5 lands. The
        Manager wanted this work to depend on EX5's verdict, and we
        don't have it yet. No code changes from me in the meantime.
        </example>
        """
        repos = await ctx.deps.get_repos()
        task = await repos.tasks.get(task_id=task_id)
        if task is None:
            raise ValueError(f"task not found: {task_id}")
        activity = await repos.task_activities.add(
            project_id=task.project_id,
            task_id=task_id,
            created_in_session_id=ctx.deps.session_id,
            actor_agent_id=actor_agent_id or ctx.deps.agent_id,
            actor=actor,
            kind="comment",
            body=comment,
            payload=payload or {},
        )
        event = await ctx.deps.record_event(
            event_type="task.comment_added",
            message=comment,
            payload={"activity_id": activity.id, "task_id": task_id},
        )
        await ctx.deps.publish_record(record=activity, event=event)
        return AddTaskCommentResult(success=True, activity=activity.model_dump())
