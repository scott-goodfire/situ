import { researchTaskRepository } from "@situ/research-projects";
import { researchTaskVerificationRepository } from "@situ/research-projects";
import type { LiveAgentSliceRunnerConfig, SeedResearchTaskConfig } from "./types";

export async function seedResearchTasks({
  researchProjectId,
  seeds,
}: {
  researchProjectId: string;
  seeds: SeedResearchTaskConfig[];
}): Promise<void> {
  for (const seed of seeds) {
    const task = await researchTaskRepository.create({
      researchProjectId,
      type: seed.type,
      priority: seed.priority,
      title: seed.title,
      workerPrompt: seed.workerPrompt,
      verificationPrompt: seed.verificationPrompt,
      targetKind: seed.targetKind,
      targetId: seed.targetId,
      payload: {
        source: "live-agent-eval-seed",
      },
    });
    if (seed.verification) {
      await researchTaskRepository.transition({
        researchTaskId: task.id,
        status: "awaiting_verification",
        resultSummary: seed.resultSummary ?? seed.verification.evidenceSummary,
      });
      const verificationPayload: Record<string, unknown> = {
        source: "live-agent-eval-seed",
      };
      if (seed.verification.signals && Object.keys(seed.verification.signals).length > 0) {
        verificationPayload.signals = seed.verification.signals;
      }
      await researchTaskVerificationRepository.create({
        researchTaskId: task.id,
        status: seed.verification.status,
        profile: seed.verification.profile,
        verifierPrompt: seed.verificationPrompt,
        judgment: seed.verification.judgment,
        evidenceSummary: seed.verification.evidenceSummary,
        payload: verificationPayload,
      });
    } else if (seed.status && seed.status !== "planned") {
      await researchTaskRepository.transition({
        researchTaskId: task.id,
        status: seed.status,
        resultSummary: seed.resultSummary,
      });
    }
  }
}

export async function createConfiguredResearchTask({
  config,
  researchProjectId,
}: {
  config: LiveAgentSliceRunnerConfig;
  researchProjectId: string;
}): Promise<Awaited<ReturnType<typeof researchTaskRepository.create>>> {
  if (!config.title?.trim()) {
    throw new Error(`${config.driver} eval requires title.`);
  }
  if (!config.workerPrompt?.trim()) {
    throw new Error(`${config.driver} eval requires workerPrompt.`);
  }
  if (!config.verificationPrompt?.trim()) {
    throw new Error(`${config.driver} eval requires verificationPrompt.`);
  }
  return researchTaskRepository.create({
    researchProjectId,
    type: config.type,
    priority: config.priority,
    title: config.title,
    workerPrompt: config.workerPrompt,
    verificationPrompt: config.verificationPrompt,
    targetKind: config.targetKind,
    targetId: config.targetId,
    payload: {
      source: "live-agent-eval",
      driver: config.driver,
    },
  });
}
