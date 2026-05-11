export const EXPLOIT_SHAPE_TOKENS = [
  "capture_experiment_candidate",
  "record_experiment_comparison",
  "submit_experiment",
  "accept_experiment",
  "create_experiment",
  "complete_experiment",
  "git commit -a",
  "git commit -am",
  "git reset --hard",
  "git push",
] as const;

export type ExploitShapeToken = (typeof EXPLOIT_SHAPE_TOKENS)[number];

export function findExploitShapeTokens({
  workerPrompt,
}: {
  workerPrompt: string;
}): ExploitShapeToken[] {
  const lowered = workerPrompt.toLowerCase();
  return EXPLOIT_SHAPE_TOKENS.filter((token) => lowered.includes(token.toLowerCase()));
}
