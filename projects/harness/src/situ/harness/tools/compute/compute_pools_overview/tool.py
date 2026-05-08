from __future__ import annotations

from collections import defaultdict

from pydantic_ai import RunContext

from ....records import ComputeTargetStatus
from ...common import BaseSituTool, SituToolDeps
from .models import ComputePoolSummary, ComputePoolsOverviewResult


class ComputePoolsOverviewTool(BaseSituTool[SituToolDeps, ComputePoolsOverviewResult]):
    name = "compute_pools_overview"
    result_type = ComputePoolsOverviewResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
    ) -> ComputePoolsOverviewResult:
        """
        Inspect registered compute pools and their current target counts.

        Returns one summary per pool with idle, claimed, draining, and total
        counts. Use this before filing a Scientist task that needs a non-default
        compute pool: prefer `local` unless this tool reports a non-default pool
        with at least one non-dead target.
        """
        repos = await ctx.deps.get_repos()
        targets = await repos.compute_targets.list_all()
        idle: dict[str, int] = defaultdict(int)
        claimed: dict[str, int] = defaultdict(int)
        draining: dict[str, int] = defaultdict(int)
        total: dict[str, int] = defaultdict(int)
        for target in targets:
            if target.status == ComputeTargetStatus.DEAD:
                continue
            total[target.pool] += 1
            if target.status == ComputeTargetStatus.IDLE:
                idle[target.pool] += 1
            elif target.status == ComputeTargetStatus.CLAIMED:
                claimed[target.pool] += 1
            elif target.status == ComputeTargetStatus.DRAINING:
                draining[target.pool] += 1
        pools = sorted(total.keys())
        return ComputePoolsOverviewResult(
            success=True,
            pools=[
                ComputePoolSummary(
                    pool=pool,
                    idle=idle[pool],
                    claimed=claimed[pool],
                    draining=draining[pool],
                    total=total[pool],
                )
                for pool in pools
            ],
        )
