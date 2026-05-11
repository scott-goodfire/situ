import { z } from "zod";

import { DEFAULT_CLAUDE_AGENT_MODEL } from "../../roles/models";

export const PLANNING_ADVICE_MODEL = DEFAULT_CLAUDE_AGENT_MODEL;

export const planningAdviceSchema = z.object({
  diversity: z.enum(["low", "mixed", "broad"]),
  summary: z.string(),
  activeBranches: z.array(
    z.object({
      hypothesisId: z.string(),
      title: z.string(),
      recentExperiments: z.number(),
      status: z.enum(["fresh", "diminishing", "exhausted"]),
      statusNote: z.string(),
    }),
  ),
  strandedTriage: z.array(
    z.object({
      hypothesisId: z.string(),
      title: z.string(),
      evidenceNote: z.string(),
      relevanceToExhausted: z.string().optional(),
    }),
  ),
  suggestion: z.string(),
});

export type PlanningAdvice = z.infer<typeof planningAdviceSchema>;

export function parsePlanningAdvice({ text }: { text: string }): PlanningAdvice | null {
  if (!text.trim()) {
    return null;
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }
  try {
    const parsed = JSON.parse(match[0]) as unknown;
    return planningAdviceSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function fallbackPlanningAdvice(): PlanningAdvice {
  return {
    diversity: "mixed",
    summary: "Planning advisor was unavailable for this turn.",
    activeBranches: [],
    strandedTriage: [],
    suggestion: "Proceed with your own judgment.",
  };
}
