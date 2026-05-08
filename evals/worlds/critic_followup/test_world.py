from __future__ import annotations

import pytest

from evals.worlds.critic_followup.models import CriticFollowupSeed
from evals.worlds.critic_followup.world import (
    FOLLOWUP_CANDIDATE_COMMIT,
    FOLLOWUP_EXPERIMENT_ID,
    FOLLOWUP_RESEARCH_THREAD,
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
@pytest.mark.asyncio
async def test_critic_followup_world_seeds_reviewed_experiment(
    seed: CriticFollowupSeed,
) -> None:
    world = await CriticFollowupWorld.create(seed=seed)
    try:
        board = await world.project_board()
        plan_tasks = [task for task in board["tasks"] if task["kind"] == "plan"]
        reviews = [
            activity
            for activity in board["experiment_activities"]
            if (activity.get("payload") or {}).get("activity_type")
            == "critic_review"
        ]
        experiments = [
            experiment
            for experiment in board["experiments"]
            if experiment["id"] == FOLLOWUP_EXPERIMENT_ID
        ]

        assert len(plan_tasks) == 1
        assert plan_tasks[0]["payload"]["experiment_id"] == FOLLOWUP_EXPERIMENT_ID
        assert plan_tasks[0]["payload"]["candidate_commit"] == FOLLOWUP_CANDIDATE_COMMIT
        assert plan_tasks[0]["payload"]["research_thread"] == FOLLOWUP_RESEARCH_THREAD
        assert len(experiments) == 1
        assert experiments[0]["candidate_commit"] == FOLLOWUP_CANDIDATE_COMMIT
        assert experiments[0]["research_thread"] == FOLLOWUP_RESEARCH_THREAD
        assert len(reviews) == 1
        assert reviews[0]["payload"]["verdict"] == seed
        assert reviews[0]["payload"]["reviewed_measurement_ids"]
    finally:
        world.teardown()
