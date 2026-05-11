import { CUDA_VISIBLE_DEVICES_METADATA_KEY } from "../constants";
import { computeTargetRepository } from "../repository";
import {
  computeStringPayloadValue,
  metadataEnvValue,
  targetMetadata,
  workItemPayload,
} from "../__shared__";
import type { ComputeTargetRecord, WorkItemLike } from "../types";

export async function envForWorkItem({
  workItem,
}: {
  workItem: WorkItemLike;
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
  return targetExecutionEnv({ target });
}

function targetExecutionEnv({ target }: { target: ComputeTargetRecord }): Record<string, string> {
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
