import { emptyComputeStatusCounts } from "../../../../runtime/compute";
import {
  computeTargetRepository,
  type ComputeTargetStatus,
} from "../../../../data/repositories/compute-targets";

export async function computePoolsOverview(): Promise<{
  pools: Array<{
    pool: string;
    total: number;
    active: number;
    statuses: Record<ComputeTargetStatus, number>;
  }>;
  targets: Array<{
    id: string;
    pool: string;
    kind: string;
    label: string | null;
    status: ComputeTargetStatus;
    claimedByResearchTaskId: string | null;
    claimedAt: string | null;
    leaseExpiresAt: string | null;
    lastHeartbeat: string | null;
  }>;
}> {
  const targets = await computeTargetRepository.listAll();
  const pools = new Map<
    string,
    {
      pool: string;
      total: number;
      active: number;
      statuses: Record<ComputeTargetStatus, number>;
    }
  >();

  for (const target of targets) {
    const pool = pools.get(target.pool) ?? {
      pool: target.pool,
      total: 0,
      active: 0,
      statuses: emptyComputeStatusCounts(),
    };
    pool.total += 1;
    if (target.status !== "dead") {
      pool.active += 1;
    }
    pool.statuses[target.status] += 1;
    pools.set(target.pool, pool);
  }

  return {
    pools: [...pools.values()],
    targets: targets.map((target) => ({
      id: target.id,
      pool: target.pool,
      kind: target.kind,
      label: target.label,
      status: target.status,
      claimedByResearchTaskId: target.claimedByResearchTaskId,
      claimedAt: target.claimedAt,
      leaseExpiresAt: target.leaseExpiresAt,
      lastHeartbeat: target.lastHeartbeat,
    })),
  };
}
