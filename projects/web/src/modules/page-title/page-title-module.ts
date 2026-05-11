function titleFromGoal({ goal }: { goal: string }): string {
  const firstLine = goal
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  const title = firstLine ?? goal.trim();
  return title.length <= 80 ? title : `${title.slice(0, 77).trimEnd()}...`;
}

export const pageTitleModule = {
  titleFromGoal,
} as const;
