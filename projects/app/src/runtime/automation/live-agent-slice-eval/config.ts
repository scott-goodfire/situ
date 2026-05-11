import { z } from "zod";

import {
  DRIVERS,
  PROJECT_PHASES,
  RESEARCH_TASK_PRIORITIES,
  RESEARCH_TASK_STATUSES,
  RESEARCH_TASK_TYPES,
  VERIFICATION_PROFILES,
  VERIFICATION_STATUSES,
  type LiveAgentSliceEvalConfig,
} from "./types";

const positiveSeconds = z
  .union([z.number(), z.string()])
  .transform((value) => Number(value))
  .refine(
    (value) => Number.isFinite(value) && value > 0,
    "timeoutSeconds must be a positive number.",
  );

const optionalTrimmedString = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined);

const seedVerificationSchema = z.object({
  status: z.enum(VERIFICATION_STATUSES),
  profile: z.enum(VERIFICATION_PROFILES).default("general"),
  judgment: z.string().trim().min(1, "judgment is required."),
  evidenceSummary: z.string().trim().min(1, "evidenceSummary is required."),
});

const seedResearchTaskSchema = z
  .object({
    title: z.string().trim().min(1, "title is required."),
    type: z.enum(RESEARCH_TASK_TYPES),
    priority: z.enum(RESEARCH_TASK_PRIORITIES).default("normal"),
    workerPrompt: z.string().trim().min(1, "workerPrompt is required."),
    verificationPrompt: z.string().trim().min(1, "verificationPrompt is required."),
    targetKind: optionalTrimmedString,
    targetId: optionalTrimmedString,
    status: z.enum(RESEARCH_TASK_STATUSES).optional(),
    resultSummary: optionalTrimmedString,
    verification: seedVerificationSchema.optional(),
  })
  .refine((input) => Boolean(input.targetKind) === Boolean(input.targetId), {
    message: "targetKind and targetId must be provided together.",
    path: ["targetId"],
  });

const liveAgentSliceEvalConfigSchema = z
  .object({
    driver: z.enum(DRIVERS),
    goal: z.string().trim().min(1, "goal is required."),
    timeoutSeconds: positiveSeconds,
    projectPhase: z.enum(PROJECT_PHASES).default("search"),
    baselineSummary: optionalTrimmedString,
    title: optionalTrimmedString,
    type: z.enum(RESEARCH_TASK_TYPES).default("explore"),
    priority: z.enum(RESEARCH_TASK_PRIORITIES).default("high"),
    targetKind: optionalTrimmedString,
    targetId: optionalTrimmedString,
    workerPrompt: optionalTrimmedString,
    verificationPrompt: optionalTrimmedString,
    workerSummary: optionalTrimmedString,
    seedResearchTasks: z.array(seedResearchTaskSchema).default([]),
  })
  .refine((input) => Boolean(input.targetKind) === Boolean(input.targetId), {
    message: "targetKind and targetId must be provided together.",
    path: ["targetId"],
  });

export function readLiveAgentSliceEvalConfig({
  argv,
}: {
  argv: string[];
}): LiveAgentSliceEvalConfig {
  const raw = argv[2];
  if (!raw) {
    throw new Error("Live agent slice eval config JSON is required.");
  }
  return parseLiveAgentSliceEvalConfig({ value: JSON.parse(raw) as unknown });
}

export function parseLiveAgentSliceEvalConfig({
  value,
}: {
  value: unknown;
}): LiveAgentSliceEvalConfig {
  return liveAgentSliceEvalConfigSchema.parse(value);
}
