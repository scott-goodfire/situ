from __future__ import annotations

from situ.harness.tools.common import SituToolDeps
from situ.harness.tools.workspace_state import InspectWorkspaceStateTool
from situ.harness.tools.common import invoke_situ_tool_sync
from evals.worlds.repo_bootstrap import (
    BASELINE_EVALUATION_ID,
    RepoBootstrapWorld,
    SESSION_ID,
)


def test_repo_bootstrap_world_runs_native_measurement() -> None:
    world = RepoBootstrapWorld(seed="empty_repo")
    try:
        deps = SituToolDeps(
            session_id=SESSION_ID,
            repo_path=str(world.workspace_path),
            repos=world.repos,
        )

        result = deps.backend.execute("python train.py", timeout=5)
        workspace_state = invoke_situ_tool_sync(
            tool=InspectWorkspaceStateTool(),
            deps=deps,
            eval_command="python train.py",
        )

        assert result.exit_code == 0
        assert "component: baseline" in result.output
        assert "val_bpb: 2.713" in result.output
        assert workspace_state.success is True
        assert workspace_state.workspace_state is not None
        assert workspace_state.workspace_state["is_git_repo"] is True
        assert workspace_state.workspace_state["dirty"] is False
        assert world.changed_files() == []
    finally:
        world.teardown()


def test_repo_bootstrap_world_seeds_baseline_evaluation() -> None:
    world = RepoBootstrapWorld(seed="with_baseline_result")
    try:
        graph = world.project_board()

        assert [item["id"] for item in graph["evaluations"]] == [
            BASELINE_EVALUATION_ID
        ]
        assert "val_bpb: 2.713" in graph["evaluation_activities"][0]["body"]
    finally:
        world.teardown()


def test_repo_bootstrap_world_can_seed_baseline_without_hypothesis() -> None:
    world = RepoBootstrapWorld(seed="with_baseline_no_hypothesis")
    try:
        graph = world.project_board()

        assert [item["id"] for item in graph["evaluations"]] == [
            BASELINE_EVALUATION_ID
        ]
        assert graph["hypotheses"] == []
    finally:
        world.teardown()
