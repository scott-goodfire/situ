from __future__ import annotations

import pytest

from evals.worlds.app_session_loop.models import AppSessionLoopEvalInput
from evals.worlds.app_session_loop.world import AppSessionLoopWorld


@pytest.mark.asyncio
async def test_app_session_loop_world_starts_from_clean_git_repo() -> None:
    world = AppSessionLoopWorld(
        AppSessionLoopEvalInput(
            case_id="clean_git_repo",
            seed="empty_repo",
        )
    )
    try:
        assert world.changed_files() == []
    finally:
        world.teardown()


@pytest.mark.asyncio
async def test_app_session_loop_world_can_seed_baseline_without_hypothesis() -> None:
    world = await AppSessionLoopWorld.create(
        AppSessionLoopEvalInput(
            case_id="baseline_without_hypothesis",
            seed="with_baseline_no_hypothesis",
        )
    )
    try:
        graph = await world.project_board()

        assert graph["hypotheses"] == []
        assert len(graph["evaluations"]) == 1
    finally:
        world.teardown()
