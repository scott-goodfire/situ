from __future__ import annotations

from evals.worlds.research_session.world import (
    BASELINE_EVALUATION_ID,
    HYPOTHESIS_ID,
    SESSION_ID,
    ResearchSessionWorld,
)


def test_research_session_world_can_start_projectless() -> None:
    world = ResearchSessionWorld(seed="projectless")
    try:
        graph = world.project_board()

        assert graph["session"]["id"] == SESSION_ID
        assert graph["project"] is None
        assert graph["hypotheses"] == []
    finally:
        world.teardown()


def test_research_session_world_seeds_promising_results() -> None:
    world = ResearchSessionWorld(seed="with_promising_results")
    try:
        graph = world.project_board()

        assert [hypothesis["id"] for hypothesis in graph["hypotheses"]] == [
            HYPOTHESIS_ID
        ]
        assert BASELINE_EVALUATION_ID in [
            evaluation["id"] for evaluation in graph["evaluations"]
        ]
        assert len(graph["experiments"]) == 2
        assert len(graph["measurements"]) == 3
    finally:
        world.teardown()
