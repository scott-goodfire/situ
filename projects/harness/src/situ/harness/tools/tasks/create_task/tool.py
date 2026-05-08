from __future__ import annotations

from typing import Any, Literal

from pydantic_ai import RunContext

from ....records import (
    RecordStatus,
    TaskEntityKind,
    TaskKind,
    TaskPriority,
    TaskSourceKind,
    parse_task_kind,
)
from ...common import BaseSituTool, SituToolDeps
from .models import CreateTaskResult

ExperimentBaseSelector = Literal[
    "selected_checkout",
    "parent_experiment",
    "explicit_commit",
]


class CreateTaskTool(BaseSituTool[SituToolDeps, CreateTaskResult]):
    name = "create_task"
    result_type = CreateTaskResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        content: str,
        kind: TaskKind,
        work_type: str | None = None,
        priority: TaskPriority = TaskPriority.NORMAL,
        source_kind: TaskSourceKind = TaskSourceKind.MANAGER,
        task_id: str | None = None,
        parent_task_id: str | None = None,
        blocked_by_task_ids: list[str] | None = None,
        payload: dict[str, Any] | None = None,
        research_thread: str | None = None,
        parent_experiment_id: str | None = None,
        base_selector: ExperimentBaseSelector | None = None,
        base_commit: str | None = None,
        hypothesis_ids: list[str] | None = None,
        available_at: str | None = None,
        **_kwargs: Any,
    ) -> CreateTaskResult:
        """Create a project-scoped task for agent coordination.

        The `content` field is voice-bearing prose written in complete
        sentences. Reads like a well-written GitHub issue: states why the
        work matters, names the hot path, and calls out scope boundaries.
        Basic Markdown works in `title` and `content`; use short paragraphs
        and compact bullets when they make the handoff easier to follow.
        Prefer a readable handoff over a generated-looking numbered script.

        For `kind="experiment"`, pass `hypothesis_ids=[...]` with at least one
        accepted or active hypothesis. The task payload and task entity links
        will carry that hypothesis context into the Scientist pass and produced
        experiment.

        For experiment base selection, pass `base_selector="selected_checkout"`
        for independent exploration from the user's current clean checkout,
        `base_selector="parent_experiment"` plus `parent_experiment_id` to
        stack a descendant on a previous experiment's candidate state, or
        `base_selector="explicit_commit"` plus `base_commit` for an exact Git
        ref. A descendant experiment's resulting patch is the next aggregate
        candidate for that `research_thread`: it carries the parent candidate's
        useful reviewed changes plus the new tested change.

        <example field="content">
        We want to know whether the cold-start latency is data-bound or
        model-bound, because it changes which thread we should explore
        next.

        The hot path is to run EV1's cold-start track against EX5's
        commit and against the baseline B1 commit. If the two come in
        within ±2ms of each other, the model isn't the cause and we can
        stop chasing it on the model side.

        Anything beyond a measurement is out of scope for this task. If
        the result points at a code fix, please file a separate
        experiment task for that work rather than rolling it in here.
        </example>

        <example field="content">
        We need to establish the baseline measurement for this project
        before any candidate experiments are comparable.

        The work is to run python train.py with no component changes
        against EV1, record each result as a measurement on B1, and
        repeat the run three times so we have a sense of the variance.
        The task is done when all three runs are recorded on B1.

        This task doesn't need any model changes — just the existing
        baseline reproducer that's already wired up.
        </example>

        <example field="content">
        Reproduce EX9's result with the canonical seed list to confirm
        whether the +0.018 lift is real signal or seed noise.

        Run the EX9 reproducer three times against EV1 with seeds 42,
        43, and 44. Record each as a measurement on EV1 with payload
        comparison_baseline_id=B1 and seed in the payload. The task is
        done when all three are recorded.

        If the variance across the three runs covers the +0.018 lift,
        leave a comment on EX9 saying the result is seed noise. If the
        lift reproduces consistently, leave a comment that EX9 is ready
        for Critic review.
        </example>

        <example field="content">
        Re-run EX1 from its candidate commit so we can tell whether the
        shallow model win is real. This continues the architecture-throughput
        thread and tests H2 against the same baseline measurements we already
        have from B1.

        Use `base_selector="parent_experiment"` with `parent_experiment_id="EX1"`.
        The worktree should already contain the MLP(2, [8, 1]) change, so this
        task is measurement-only: read `program.md`, run `uv run train.py`, and
        record `val_loss`, `peak_rss_mb`, and `num_steps` on a new evaluation
        for the new experiment.

        The task is done when the evaluation has a measurement, the experiment
        is submitted for Critic review, and the completion note names the
        experiment and measurement IDs.
        </example>
        """
        repos = await ctx.deps.get_repos()
        project_id = await ctx.deps.require_project_id()
        session_id = ctx.deps.session_id
        checked_kind = parse_task_kind(kind)
        resolved_task_id = task_id or await repos.tasks.next_id(project_id=project_id)
        resolved_payload = dict(payload or {})
        _add_if_present(resolved_payload, "research_thread", research_thread)
        _add_if_present(resolved_payload, "parent_experiment_id", parent_experiment_id)
        _add_if_present(resolved_payload, "base_selector", base_selector)
        _add_if_present(resolved_payload, "base_commit", base_commit)
        resolved_hypothesis_ids: list[str] = []
        if checked_kind == TaskKind.EXPERIMENT:
            resolved_hypothesis_ids = _coerce_hypothesis_ids(
                hypothesis_ids=hypothesis_ids,
                payload=resolved_payload,
            )
            if not resolved_hypothesis_ids:
                return self._failure(
                    code="experiment_task_requires_hypothesis",
                    message=(
                        "Experiment tasks must include hypothesis_ids with at "
                        "least one accepted or active hypothesis. File "
                        "Researcher or hypothesize work first if the project "
                        "does not have one."
                    ),
                )
            hypothesis_error = await _validate_experiment_task_hypotheses(
                repos=repos,
                project_id=project_id,
                hypothesis_ids=resolved_hypothesis_ids,
            )
            if hypothesis_error is not None:
                return self._failure(
                    code="experiment_task_hypothesis_not_ready",
                    message=hypothesis_error,
                )
            resolved_payload["hypothesis_ids"] = resolved_hypothesis_ids
        task = await repos.tasks.create(
            task_id=resolved_task_id,
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            content=content,
            kind=checked_kind,
            work_type=work_type,
            priority=priority,
            source_kind=source_kind,
            parent_task_id=parent_task_id,
            payload=resolved_payload,
            available_at=available_at,
        )
        event = await ctx.deps.record_event(
            event_type="task.created",
            message=f"Created task {task.id}",
            payload={
                "task_id": task.id,
                "kind": task.kind.value,
                **(
                    {"hypothesis_ids": resolved_hypothesis_ids}
                    if resolved_hypothesis_ids
                    else {}
                ),
            },
        )
        await ctx.deps.publish_record(record=task, event=event)

        task_entity_links = []
        for hypothesis_id in resolved_hypothesis_ids:
            link = await repos.task_entity_links.create(
                project_id=project_id,
                task_id=task.id,
                entity_kind=TaskEntityKind.HYPOTHESIS,
                entity_id=hypothesis_id,
                relationship="tests",
            )
            await ctx.deps.publish_record(record=link, event=event)
            task_entity_links.append(link.model_dump())

        dependencies = []
        for blocked_by_task_id in blocked_by_task_ids or []:
            dependency = await repos.task_dependencies.create(
                project_id=project_id,
                task_id=task.id,
                blocked_by_task_id=blocked_by_task_id,
            )
            await ctx.deps.publish_record(record=dependency, event=event)
            dependencies.append(dependency.model_dump())

        return CreateTaskResult(
            success=True,
            task=task.model_dump(),
            dependencies=dependencies,
            task_entity_links=task_entity_links,
        )


def _add_if_present(payload: dict[str, Any], key: str, value: Any | None) -> None:
    if value is not None:
        payload[key] = value


def _coerce_hypothesis_ids(
    *,
    hypothesis_ids: list[str] | None,
    payload: dict[str, Any],
) -> list[str]:
    raw: Any = hypothesis_ids
    if raw is None:
        raw = payload.get("hypothesis_ids")
    if raw is None:
        raw = payload.get("hypothesis_id")

    if isinstance(raw, str):
        items = [raw]
    elif isinstance(raw, list | tuple | set):
        items = list(raw)
    else:
        items = []

    unique_ids: list[str] = []
    for item in items:
        if not isinstance(item, str):
            continue
        hypothesis_id = item.strip()
        if hypothesis_id and hypothesis_id not in unique_ids:
            unique_ids.append(hypothesis_id)
    return unique_ids


async def _validate_experiment_task_hypotheses(
    *,
    repos: Any,
    project_id: str,
    hypothesis_ids: list[str],
) -> str | None:
    allowed_statuses = {RecordStatus.ACCEPTED, RecordStatus.ACTIVE}
    for hypothesis_id in hypothesis_ids:
        hypothesis = await repos.hypotheses.get(hypothesis_id=hypothesis_id)
        if hypothesis is None or hypothesis.project_id != project_id:
            return f"Experiment task references unknown hypothesis: {hypothesis_id}."
        if hypothesis.status not in allowed_statuses:
            allowed = ", ".join(sorted(status.value for status in allowed_statuses))
            return (
                f"Experiment task references hypothesis {hypothesis_id} with "
                f"status {hypothesis.status.value!r}; use {allowed} hypotheses."
            )
    return None
