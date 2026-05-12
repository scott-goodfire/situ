import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { safePathSegment, worktreeModule } from "@situ/worktrees";

import { getRuntimeContext } from "../../config/session-context";
import { artifactRepository } from "@situ/research-records";
import { experimentRepository } from "@situ/research-records";
import type { CaptureExperimentCandidateResult, WorktreeRuntimeContext } from "./types";

export async function captureExperimentCandidate({
  experimentId,
  runtime = getRuntimeContext(),
  commitMessage,
}: {
  experimentId: string;
  runtime?: WorktreeRuntimeContext;
  commitMessage?: string;
}): Promise<CaptureExperimentCandidateResult> {
  const experiment = await experimentRepository.require({ experimentId });
  const worktreePath = experiment.worktreePath;
  const baseCommit = experiment.baseCommit;
  if (!worktreePath || !baseCommit) {
    throw new Error(`Experiment worktree has not been prepared: ${experimentId}`);
  }

  const result = await worktreeModule.captureCandidate({
    worktreePath,
    baseCommit,
    commitMessage: commitMessage ?? `situ experiment ${experimentId}`,
  });

  if (result.isEmpty) {
    await experimentRepository.addActivity({
      experimentId,
      actor: "system",
      kind: "recorded",
      body: "No candidate patch captured; the experiment worktree has no changes.",
      payload: { activityType: "experiment_candidate_empty" },
    });
    return {
      experimentId,
      baseCommit,
      candidateCommit: null,
      patchArtifactId: null,
    };
  }

  const patchPath = await writeCandidatePatch({
    experimentId,
    runtime,
    patchContent: result.patchContent,
  });
  const patchStat = await stat(patchPath);
  const artifact = await artifactRepository.create({
    title: "Candidate patch",
    path: patchPath,
    kind: "patch",
    entityKind: "experiment",
    entityId: experimentId,
    createdByResearchTaskId: experiment.createdByResearchTaskId ?? undefined,
    mediaType: "text/x-patch",
    sizeBytes: patchStat.size,
  });

  await experimentRepository.updateCandidateMetadata({
    experimentId,
    candidateCommit: result.candidateCommit,
  });

  await experimentRepository.addActivity({
    experimentId,
    actor: "system",
    kind: "recorded",
    body: `Captured candidate commit ${result.candidateCommit.slice(0, 12)}.`,
    payload: {
      activityType: "experiment_candidate_captured",
      baseCommit,
      candidateCommit: result.candidateCommit,
      patchArtifactId: artifact.id,
      patchPath,
    },
  });

  return {
    experimentId,
    baseCommit,
    candidateCommit: result.candidateCommit,
    patchArtifactId: artifact.id,
  };
}

async function writeCandidatePatch({
  experimentId,
  runtime,
  patchContent,
}: {
  experimentId: string;
  runtime: WorktreeRuntimeContext;
  patchContent: string;
}): Promise<string> {
  const patchPath = join(
    runtime.sessionHome,
    "artifacts",
    safePathSegment({ value: experimentId }),
    "candidate.patch",
  );
  await mkdir(dirname(patchPath), { recursive: true });
  await writeFile(patchPath, patchContent);
  return patchPath;
}
