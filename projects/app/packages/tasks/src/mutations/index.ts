export const TASK_MUTATIONS = [
  "task/create",
  "task/assign",
  "task/unassign",
  "task/update_status",
  "task/label",
] as const;

export type TaskMutationName = (typeof TASK_MUTATIONS)[number];
