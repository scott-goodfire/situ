from __future__ import annotations

import pytest

from evals.worlds.critic_followup.models import CriticFollowupSeed
from evals.worlds.critic_followup.world import (
    FOLLOWUP_EXPERIMENT_ID,
    CriticFollowupWorld,
)


@pytest.mark.parametrize(
    "seed",
    [
        "needs_reproduction",
        "invalid",
        "human_review",
        "usable",
    ],
)
def test_critic_followup_world_seeds_reviewed_experiment(
    seed: CriticFollowupSeed,
) -> None:
    world = CriticFollowupWorld(seed=seed)
    try:
        board = world.project_board()
        plan_tasks = [task for task in board["tasks"] if task["kind"] == "plan"]
        reviews = [
            activity
            for activity in board["experiment_activities"]
            if (activity.get("payload") or {}).get("activity_type")
            == "critic_review"
        ]

        assert len(plan_tasks) == 1
        assert plan_tasks[0]["payload"]["experiment_id"] == FOLLOWUP_EXPERIMENT_ID
        assert len(reviews) == 1
        assert reviews[0]["payload"]["verdict"] == seed
        assert reviews[0]["payload"]["reviewed_measurement_ids"]
    finally:
        world.teardown()
