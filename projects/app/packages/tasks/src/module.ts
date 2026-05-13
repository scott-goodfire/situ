import { TASKS_SYNC_PREFIX } from "./sync";

export const tasksModule = {
  name: "@situ/tasks",
  syncPrefix: TASKS_SYNC_PREFIX,
} as const;
