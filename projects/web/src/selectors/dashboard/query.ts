import type { ProjectWorkspaceData } from "../../features/project-workspace/types";

export const DEFAULT_MAX_EXPERIMENTS = 6;

export function experimentBudgetBar({
  current,
  total,
  width = 6,
}: {
  current: number;
  total: number;
  width?: number;
}): string {
  if (total <= 0) {
    return `[${"-".repeat(width)}]`;
  }

  const filled = Math.max(
    0,
    Math.min(width, Math.round((current / total) * width)),
  );

  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`;
}
