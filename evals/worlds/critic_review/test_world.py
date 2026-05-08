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
async def test_critic_review_world_seeds_status_lane_record(
    seed: CriticReviewSeed,
) -> None:
    world = await CriticReviewWorld.create(seed=seed)
    try:
        overview = await world.project_overview()
        experiments = [
            experiment for experiment in overview["experiments"] if experiment["id"] == "EX1"
        ]
        evaluations = [
            evaluation for evaluation in overview["evaluations"] if evaluation["id"] == "EV2"
        ]

        assert not [task for task in overview["tasks"] if task["kind"] == "review"]
        assert len(experiments) == 1
        assert experiments[0]["status"] == "in_review"
        assert len(evaluations) == 1
        assert evaluations[0]["status"] == "in_review"
        assert overview["measurements"]
    finally:
        world.teardown()
