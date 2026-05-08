from __future__ import annotations

from dataclasses import dataclass
from typing import Any, cast

import pytest

from situ.harness.tools.common import BaseSituTool, SituToolDeps
from situ.harness.tools.workspace_state import InspectWorkspaceStateTool
from evals.worlds.repo_bootstrap import (
    BASELINE_EVALUATION_ID,
    RepoBootstrapWorld,
    SESSION_ID,
)


@dataclass(slots=True)
class _DirectToolContext:
    deps: SituToolDeps


async def _invoke_situ_tool(
    *,
    tool: BaseSituTool,
    deps: SituToolDeps,
    **kwargs: Any,
) -> Any:
    tool_return = await tool._build_tool_function()(
        cast(Any, _DirectToolContext(deps=deps)),
        **kwargs,
    )
    return tool_return.return_value


@pytest.mark.asyncio
async def test_repo_bootstrap_world_runs_native_measurement() -> None:
    world = await RepoBootstrapWorld.create(seed="empty_repo")
    try:
        deps = SituToolDeps(
            session_id=SESSION_ID,
            repo_path=str(world.workspace_path),
            repos=world.repos,
        )

        result = await deps.backend.execute("python train.py", timeout=5)
        workspace_state = await _invoke_situ_tool(
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


@pytest.mark.asyncio
async def test_repo_bootstrap_world_seeds_baseline_evaluation() -> None:
    world = await RepoBootstrapWorld.create(seed="with_baseline_result")
    try:
        graph = await world.project_overview()

        assert [item["id"] for item in graph["evaluations"]] == [
            BASELINE_EVALUATION_ID
        ]
        assert "val_bpb: 2.713" in graph["measurements"][0]["body"]
    finally:
        world.teardown()


@pytest.mark.asyncio
async def test_repo_bootstrap_world_can_seed_baseline_without_hypothesis() -> None:
    world = await RepoBootstrapWorld.create(seed="with_baseline_no_hypothesis")
    try:
        graph = await world.project_overview()

        assert [item["id"] for item in graph["evaluations"]] == [
            BASELINE_EVALUATION_ID
        ]
        assert graph["hypotheses"] == []
    finally:
        world.teardown()
