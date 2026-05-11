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

const DEFAULT_COMPUTE_POOL = "local";
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

function researchTaskComputePool({
  researchTask,
}: {
  researchTask: ResearchTaskRecord;
}): string | undefined {
  const payload = researchTaskPayload({ researchTask });
  const compute = jsonModule.record({ value: payload.compute });
  const pool = compute.pool;
  return typeof pool === "string" && pool.trim() ? pool.trim() : undefined;
}

function researchTaskPayload({
  researchTask,
}: {
  researchTask: ResearchTaskRecord;
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

export async function ensureDefaultLocalComputeTarget(): Promise<ComputeTargetRecord> {
  const targets = await computeTargetRepository.listForPool({
    pool: DEFAULT_COMPUTE_POOL,
  });
  const active = targets.find((target) => target.status !== "dead");
  if (active) {
    return active;
  }
  return computeTargetRepository.upsert({
    pool: DEFAULT_COMPUTE_POOL,
    kind: "local",
    label: DEFAULT_COMPUTE_LABEL,
  });
}

export async function explicitComputeTargetConcurrency(): Promise<number | undefined> {
  const targets = await computeTargetRepository.listAll();
  const count = targets.filter((target) => isExplicitComputeTarget({ target })).length;
  return count === 0 ? undefined : count;
}

function isExplicitComputeTarget({ target }: { target: ComputeTargetRecord }): boolean {
  if (target.status === "dead") {
    return false;
  }
  return !(
    target.pool === DEFAULT_COMPUTE_POOL &&
    target.kind === "local" &&
    target.label === DEFAULT_COMPUTE_LABEL &&
    target.metadataJson === "{}"
  );
}

export async function claimComputeForResearchTask({
  researchTask,
}: {
  researchTask: ResearchTaskRecord;
}): Promise<ResearchTaskComputeClaim> {
  const pool = researchTaskComputePool({ researchTask });
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
