export type Effort = "medium" | "high";

export const DEFAULT_EFFORT: Effort = "high";

const MODEL_BY_EFFORT: Record<Effort, string> = {
  medium: "claude-sonnet-4-6",
  high: "claude-opus-4-7",
};

const VALID_EFFORTS = new Set<Effort>(["medium", "high"]);

export function modelForEffort({ effort }: { effort: Effort }): string {
  return MODEL_BY_EFFORT[effort];
}

export function effortFromEnv(): Effort {
  const raw = process.env.SITU_EFFORT?.trim().toLowerCase();
  if (raw === undefined || raw === "") {
    return DEFAULT_EFFORT;
  }
  if (VALID_EFFORTS.has(raw as Effort)) {
    return raw as Effort;
  }
  return DEFAULT_EFFORT;
}

export const DEFAULT_CLAUDE_AGENT_MODEL: string = modelForEffort({
  effort: effortFromEnv(),
});
