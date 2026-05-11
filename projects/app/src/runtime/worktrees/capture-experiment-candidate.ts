import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { getRuntimeContext } from "../../config/session-context";
import { artifactRepository } from "../../data/repositories/artifacts";
import { experimentRepository } from "../../data/repositories/experiments";
import { git } from "./git-command";
import { safePathSegment } from "./path-utils";
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

  const status = await git({
    cwd: worktreePath,
    args: ["status", "--porcelain=v1", "--untracked-files=all"],
    trimStdout: true,
  });
  if (!status.trim()) {
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

  await createCandidateCommit({
    commitMessage: commitMessage ?? `Situ experiment ${experimentId}`,
    worktreePath,
  });
  const candidateCommit = await git({
    cwd: worktreePath,
    args: ["rev-parse", "HEAD"],
    trimStdout: true,
  });
  const patchPath = await writeCandidatePatch({
    baseCommit,
    candidateCommit,
    experimentId,
    runtime,
    worktreePath,
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
    candidateCommit,
  });

  await experimentRepository.addActivity({
    experimentId,
    actor: "system",
    kind: "recorded",
    body: `Captured candidate commit ${candidateCommit.slice(0, 12)}.`,
    payload: {
      activityType: "experiment_candidate_captured",
      baseCommit,
      candidateCommit,
      patchArtifactId: artifact.id,
      patchPath,
    },
  });

  return {
    experimentId,
    baseCommit,
    candidateCommit,
    patchArtifactId: artifact.id,
  };
}

async function createCandidateCommit({
  commitMessage,
  worktreePath,
}: {
  commitMessage: string;
  worktreePath: string;
}): Promise<void> {
  await git({ cwd: worktreePath, args: ["add", "-A"] });
  await git({
    cwd: worktreePath,
    args: [
      "-c",
      "user.name=Situ",
      "-c",
      "user.email=situ@local.invalid",
      "commit",
      "-m",
      commitMessage,
    ],
  });
}

async function writeCandidatePatch({
  baseCommit,
  candidateCommit,
  experimentId,
  runtime,
  worktreePath,
}: {
  baseCommit: string;
  candidateCommit: string;
  experimentId: string;
  runtime: WorktreeRuntimeContext;
  worktreePath: string;
}): Promise<string> {
  const patch = await git({
    cwd: worktreePath,
    args: ["diff", "--binary", baseCommit, candidateCommit],
    trimStdout: false,
  });
  const patchPath = join(
    runtime.sessionHome,
    "artifacts",
    safePathSegment({ value: experimentId }),
    "candidate.patch",
  );
  await mkdir(dirname(patchPath), { recursive: true });
  await writeFile(patchPath, patch);
  return patchPath;
}
