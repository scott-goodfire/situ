from __future__ import annotations

import pytest

from evals.worlds.critic_review.models import CriticReviewSeed
from evals.worlds.critic_review.world import CriticReviewWorld


@pytest.mark.parametrize(
    "seed",
    [
        "selection_on_noise",
        "seed_hacking",
        "adaptive_overfitting",
        "greedy_hill_climbing",
        "comparability_break",
    ],
)
@pytest.mark.asyncio
async def test_critic_review_world_seeds_linked_review_task(
    seed: CriticReviewSeed,
) -> None:
    world = await CriticReviewWorld.create(seed=seed)
    try:
        overview = await world.project_overview()
        review_tasks = [task for task in overview["tasks"] if task["kind"] == "review"]

        assert len(review_tasks) == 1
        assert review_tasks[0]["payload"]["experiment_id"] == "EX1"
        assert overview["experiments"][0]["id"] == "EX1"
        assert overview["measurements"]
        assert review_tasks[0]["payload"]["measurement_ids"]
        assert any(
            link["entity_kind"] == "experiment"
            and link["relationship"] == "reviews"
            for link in overview["task_entity_links"]
        )
    finally:
        world.teardown()
