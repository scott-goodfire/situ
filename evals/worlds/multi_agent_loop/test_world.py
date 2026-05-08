from __future__ import annotations

import pytest

from evals.worlds.multi_agent_loop.world import MultiAgentLoopWorld


@pytest.mark.asyncio
async def test_multi_agent_loop_world_seeds_project_agents_and_plan() -> None:
    world = await MultiAgentLoopWorld.create(seed="empty_repo")
    try:
        graph = await world.project_board()

        assert sorted(agent["kind"] for agent in graph["agents"]) == [
            "manager",
            "researcher",
            "scientist",
        ]
        assert [task["kind"] for task in graph["tasks"]] == ["plan"]
    finally:
        world.teardown()


@pytest.mark.asyncio
async def test_multi_agent_loop_world_preserves_urgent_user_task() -> None:
    world = await MultiAgentLoopWorld.create(seed="with_user_urgent_task")
    try:
        graph = await world.project_board()
        tasks_by_title = {task["title"]: task for task in graph["tasks"]}

        assert tasks_by_title["User urgent: inspect eval-surface risk"][
            "source_kind"
        ] == "user"
        assert tasks_by_title["User urgent: inspect eval-surface risk"][
            "priority"
        ] == "urgent"
        assert tasks_by_title["Normal backlog baseline task"]["priority"] == "normal"
    finally:
        world.teardown()
