from __future__ import annotations

from evals.worlds.app_session_loop.models import (
    AppSessionLoopEvalInput,
    AppSessionLoopEvalOutput,
)
from evals.worlds.app_session_loop.world import AppSessionLoopWorld


def run_app_session_loop(args: AppSessionLoopEvalInput) -> AppSessionLoopEvalOutput:
    world = AppSessionLoopWorld(args)
    try:
        world.run()
        session_graph = world.session_graph()
        changed_files = world.changed_files()
        events = world.events()
        content = _render_content(session_graph=session_graph, events=events)
        return AppSessionLoopEvalOutput(
            content=content,
            events=events,
            session_graph=session_graph,
            workspace_files=world.workspace_files(),
            changed_files=changed_files,
            signals={
                "events": len(events),
                "tasks": len(session_graph.get("tasks", [])),
                "done_tasks": len(
                    [
                        task
                        for task in session_graph.get("tasks", [])
                        if task.get("status") == "done"
                    ]
                ),
                "manager_done_tasks": len(
                    [
                        task
                        for task in session_graph.get("tasks", [])
                        if task.get("kind") == "plan"
                        and task.get("status") == "done"
                    ]
                ),
                "scientist_done_tasks": len(
                    [
                        task
                        for task in session_graph.get("tasks", [])
                        if task.get("kind") != "plan"
                        and task.get("status") == "done"
                    ]
                ),
                "researcher_done_tasks": len(
                    _done_tasks_for_agent_kind(
                        session_graph=session_graph,
                        agent_kind="researcher",
                    )
                ),
                "scientist_done_tasks_by_agent": len(
                    _done_tasks_for_agent_kind(
                        session_graph=session_graph,
                        agent_kind="scientist",
                    )
                ),
                "experiments": len(session_graph.get("experiments", [])),
                "evaluations": len(session_graph.get("evaluations", [])),
                "changed_files": len(changed_files),
            },
        )
    finally:
        world.teardown()


def _done_tasks_for_agent_kind(
    *,
    session_graph: dict,
    agent_kind: str,
) -> list[dict]:
    agents_by_id = {
        agent.get("id"): agent
        for agent in session_graph.get("agents", [])
    }
    return [
        task
        for task in session_graph.get("tasks", [])
        if task.get("status") == "done"
        and agents_by_id.get(task.get("assignee_id"), {}).get("kind") == agent_kind
    ]


def _render_content(*, session_graph: dict, events: list) -> str:
    tasks = session_graph.get("tasks", [])
    experiments = session_graph.get("experiments", [])
    evaluations = session_graph.get("evaluations", [])
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
