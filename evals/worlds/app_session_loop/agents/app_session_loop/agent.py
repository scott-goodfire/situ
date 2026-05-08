from __future__ import annotations

from evals.worlds.app_session_loop.models import (
    AppSessionLoopEvalInput,
    AppSessionLoopEvalOutput,
)
from evals.worlds.app_session_loop.world import AppSessionLoopWorld


async def run_app_session_loop(args: AppSessionLoopEvalInput) -> AppSessionLoopEvalOutput:
    world = await AppSessionLoopWorld.create(args)
    try:
        await world.run()
        project_overview = await world.project_overview()
        changed_files = world.changed_files()
        events = await world.events()
        content = _render_content(project_overview=project_overview, events=events)
        return AppSessionLoopEvalOutput(
            content=content,
            events=events,
            project_overview=project_overview,
            artifact_files=await world.artifact_files(),
            workspace_files=world.workspace_files(),
            changed_files=changed_files,
            signals={
                "events": len(events),
                "tasks": len(project_overview.get("tasks", [])),
                "done_tasks": len(
                    [
                        task
                        for task in project_overview.get("tasks", [])
                        if task.get("status") == "done"
                    ]
                ),
                "manager_done_tasks": len(
                    [
                        task
                        for task in project_overview.get("tasks", [])
                        if task.get("kind") == "plan"
                        and task.get("status") == "done"
                    ]
                ),
                "scientist_done_tasks": len(
                    [
                        task
                        for task in project_overview.get("tasks", [])
                        if task.get("kind") != "plan"
                        and task.get("status") == "done"
                    ]
                ),
                "researcher_done_tasks": len(
                    _done_tasks_for_agent_kind(
                        project_overview=project_overview,
                        agent_kind="researcher",
                    )
                ),
                "critic_done_tasks": len(
                    _done_tasks_for_agent_kind(
                        project_overview=project_overview,
                        agent_kind="critic",
                    )
                ),
                "scientist_done_tasks_by_agent": len(
                    _done_tasks_for_agent_kind(
                        project_overview=project_overview,
                        agent_kind="scientist",
                    )
                ),
                "experiments": len(project_overview.get("experiments", [])),
                "evaluations": len(project_overview.get("evaluations", [])),
                "artifacts": len(project_overview.get("artifacts", [])),
                "changed_files": len(changed_files),
            },
        )
    finally:
        world.teardown()


def _done_tasks_for_agent_kind(
    *,
    project_overview: dict,
    agent_kind: str,
) -> list[dict]:
    agents_by_id = {
        agent.get("id"): agent
        for agent in project_overview.get("agents", [])
    }
    return [
        task
        for task in project_overview.get("tasks", [])
        if task.get("status") == "done"
        and agents_by_id.get(task.get("assignee_id"), {}).get("kind") == agent_kind
    ]


def _render_content(*, project_overview: dict, events: list) -> str:
    tasks = project_overview.get("tasks", [])
    experiments = project_overview.get("experiments", [])
    evaluations = project_overview.get("evaluations", [])
    event_messages = [event.message for event in events[-8:]]
    task_summaries = [
        f"{task.get('kind')}:{task.get('status')}:{task.get('title')}"
        for task in tasks
    ]
    experiment_summaries = [
        f"{experiment.get('title')} {experiment.get('summary')}"
        for experiment in experiments
    ]
    evaluation_summaries = [
        f"{evaluation.get('title')} {evaluation.get('summary')}"
        for evaluation in evaluations
    ]
    return " ".join(
        [
            *task_summaries,
            *experiment_summaries,
            *evaluation_summaries,
            *event_messages,
        ]
    )
