import { recordAppEvent } from "../../app-events";
import type { WorkItem } from "../../data/db/schema";
import {
  computeTargetRepository,
  type ComputeTargetStatus,
} from "../../data/repositories/compute-targets";
import type { ResearchTaskRecord } from "../../data/repositories/research-tasks";
import { jsonModule } from "../../modules/json";
import { workItemPayload } from "../work-items/payload";
import { targetMetadata } from "./record-payloads";
import { computeStringPayloadValue, metadataEnvValue } from "./record-values";
import { releaseComputeTarget } from "./release-compute-target";
import type { ComputeTargetRecord } from "./types";

export const DEFAULT_LOCAL_COMPUTE_POOL = "local";
const DEFAULT_COMPUTE_LABEL = "Local";
const COMPUTE_LEASE_SECONDS = 10 * 60;
const COMPUTE_HEARTBEAT_SECONDS = COMPUTE_LEASE_SECONDS;
export const CUDA_VISIBLE_DEVICES_METADATA_KEY = "cuda_visible_devices";

export type ResearchTaskComputeClaim = {
  target: ComputeTargetRecord | undefined;
  pool: string | undefined;
  poolKnown: boolean;
  required: boolean;
};

export function computePoolForResearchTask({
  researchTask,
}: {
  researchTask: Pick<ResearchTaskRecord, "payloadJson" | "type">;
}): string | undefined {
  if (researchTask.type === "verify") {
    return undefined;
  }
  const payload = researchTaskPayload({ researchTask });
  const compute = jsonModule.record({ value: payload.compute });
  const pool = compute.pool;
  return typeof pool === "string" && pool.trim() ? pool.trim() : DEFAULT_LOCAL_COMPUTE_POOL;
}

function researchTaskPayload({
  researchTask,
}: {
  researchTask: Pick<ResearchTaskRecord, "payloadJson">;
}): Record<string, unknown> {
  return jsonModule.parseRecord({ raw: researchTask.payloadJson });
}

function computeTargetExecutionEnv({
  target,
}: {
  target: ComputeTargetRecord;
}): Record<string, string> {
  const env: Record<string, string> = {
    SITU_COMPUTE_TARGET_ID: target.id,
    SITU_COMPUTE_POOL: target.pool,
  };
  if (target.label) {
    env.SITU_COMPUTE_TARGET_LABEL = target.label;
  }
  const metadata = targetMetadata({ target });
  const cudaVisibleDevices = metadataEnvValue({
    value: metadata[CUDA_VISIBLE_DEVICES_METADATA_KEY],
  });
  if (cudaVisibleDevices !== undefined) {
    env.CUDA_VISIBLE_DEVICES = cudaVisibleDevices;
  }
  return env;
}

export async function computeEnvForWorkItem({
  workItem,
}: {
  workItem: WorkItem;
}): Promise<Record<string, string>> {
  const payload = workItemPayload({ workItem });
  const computeTargetId = computeStringPayloadValue({ payload, key: "computeTargetId" });
  if (!computeTargetId) {
    return {};
  }
  const activeResearchTaskId = computeStringPayloadValue({
    payload,
    key: "activeResearchTaskId",
  });
  const target = await computeTargetRepository.require({ computeTargetId });
  if (activeResearchTaskId && target.claimedByResearchTaskId !== activeResearchTaskId) {
    throw new Error(
      `Compute target ${computeTargetId} is not leased by ResearchTask ${activeResearchTaskId}.`,
    );
  }
  if (target.status !== "claimed") {
    throw new Error(`Compute target is not claimed: ${computeTargetId}`);
  }
  return computeTargetExecutionEnv({ target });
}

export async function ensureDefaultLocalComputeTargets({
  desiredCount,
}: {
  desiredCount: number;
}): Promise<void> {
  if (desiredCount <= 0) {
    return;
  }
  const existing = await computeTargetRepository.listForPool({
    pool: DEFAULT_LOCAL_COMPUTE_POOL,
  });
  const live = existing.filter((target) => target.status !== "dead");
  if (live.length >= desiredCount) {
    return;
  }
  const usedLabels = new Set(
    live
      .map((target) => target.label)
      .filter((label): label is string => typeof label === "string" && label.length > 0),
  );
  let slot = 1;
  for (let created = 0; live.length + created < desiredCount; created += 1) {
    while (usedLabels.has(localSlotLabel({ slot }))) {
      slot += 1;
    }
    const label = localSlotLabel({ slot });
    await computeTargetRepository.upsert({
      pool: DEFAULT_LOCAL_COMPUTE_POOL,
      kind: "local",
      label,
    });
    usedLabels.add(label);
    slot += 1;
  }
}

function localSlotLabel({ slot }: { slot: number }): string {
  return `${DEFAULT_COMPUTE_LABEL} ${slot}`;
}

export async function liveComputeTargetCount(): Promise<number> {
  const targets = await computeTargetRepository.listAll();
  return targets.filter((target) => target.status !== "dead").length;
}

export async function claimComputeForResearchTask({
  researchTask,
}: {
  researchTask: ResearchTaskRecord;
}): Promise<ResearchTaskComputeClaim> {
  const pool = computePoolForResearchTask({ researchTask });
  if (!pool) {
    return { target: undefined, pool: undefined, poolKnown: false, required: false };
  }

  const poolKnown = await computeTargetRepository.poolExists({ pool });
  if (!poolKnown) {
    return { target: undefined, pool, poolKnown: false, required: true };
  }

  const target = await computeTargetRepository.claimForPool({
    pool,
    researchTaskId: researchTask.id,
    leaseSeconds: COMPUTE_LEASE_SECONDS,
  });
  if (target) {
    await recordAppEvent({
      type: "compute_target.claimed",
      message: `Compute target claimed: ${target.id}`,
      payload: {
        computeTargetId: target.id,
        pool: target.pool,
        researchTaskId: researchTask.id,
      },
    });
  }
  return { target, pool, poolKnown, required: true };
}

export async function heartbeatComputeLeaseForWorkItem({
  workItem,
}: {
  workItem: WorkItem;
}): Promise<void> {
  const payload = workItemPayload({ workItem });
  const computeTargetId = computeStringPayloadValue({ payload, key: "computeTargetId" });
  if (!computeTargetId) {
    return;
  }
  await computeTargetRepository.heartbeat({
    computeTargetId,
    owningResearchTaskId: computeStringPayloadValue({
      payload,
      key: "activeResearchTaskId",
    }),
    leaseSeconds: COMPUTE_HEARTBEAT_SECONDS,
  });
}

export async function releaseComputeForWorkItem({
  workItem,
  reason,
}: {
  workItem: WorkItem;
  reason: string;
}): Promise<void> {
  const payload = workItemPayload({ workItem });
  const computeTargetId = computeStringPayloadValue({ payload, key: "computeTargetId" });
  if (!computeTargetId) {
    return;
  }
  await releaseComputeTarget({
    computeTargetId,
    researchTaskId: computeStringPayloadValue({
      payload,
      key: "activeResearchTaskId",
    }),
    reason,
  });
}

export function emptyComputeStatusCounts(): Record<ComputeTargetStatus, number> {
  return {
    idle: 0,
    claimed: 0,
    draining: 0,
    dead: 0,
  };
}
