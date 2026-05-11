import { z } from "zod";
import {
  RESEARCH_TASK_VERIFICATION_PROFILES,
  RESEARCH_TASK_VERIFICATION_STATUSES,
} from "@situ/protocol";

import { researchTaskVerificationRepository } from "../../../data/repositories/research-task-verifications";
import { researchTaskRepository } from "../../../data/repositories/research-tasks";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  researchTaskId: z
    .string()
    .describe("ResearchTask id. Defaults to the active ResearchTask if omitted.")
    .optional(),
  status: z.enum(RESEARCH_TASK_VERIFICATION_STATUSES).describe("Verifier status."),
  profile: z
    .enum(RESEARCH_TASK_VERIFICATION_PROFILES)
    .describe("Optional verifier profile.")
    .optional(),
  judgment: z.string().describe("One short human-sounding evidence-backed judgment sentence."),
  evidenceSummary: z
    .string()
    .describe(
      "Compact human-sounding evidence or missing-evidence bullets. Required when status is passed.",
    )
    .optional(),
  signals: z
    .record(z.string(), z.unknown())
    .describe(
      "Optional structured signals layered on top of the verdict. Use `suspicious_holdout_divergence: true` when dev and held-out splits disagree in direction with meaningful held-out movement. Signals do not change the verdict — they advise the Manager about whether to redesign rather than discard.",
    )
    .optional(),
});

export const recordResearchTaskVerificationTool = defineTool({
  name: "record_research_task_verification",
  description:
    "Record a Verifier judgment for an awaiting ResearchTask, then verify, reject, or reopen it for more evidence.",
  roles: ["verifier"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const researchTaskId = toolContextModule.requiredResearchTaskId({
      explicit: input.researchTaskId,
      context,
    });
    const researchTask = await researchTaskRepository.require({ researchTaskId });
    const payload: Record<string, unknown> = {
      createdByClaudeAgentRunId: context.claudeAgentRunId,
    };
    if (input.signals && Object.keys(input.signals).length > 0) {
      payload.signals = input.signals;
    }
    return Result.ok({
      verification: await researchTaskVerificationRepository.create({
        researchTaskId,
        status: input.status,
        profile: input.profile ?? "general",
        verifierPrompt: researchTask.verificationPrompt,
        judgment: input.judgment,
        evidenceSummary: input.evidenceSummary ?? "",
        createdByAgentId: context.agentId,
        payload,
      }),
    });
  },
});
