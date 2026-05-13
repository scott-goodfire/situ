import { projects } from "./schema";

export const PROJECTS_SYNC_PREFIX = "projects";

export const projectsSyncSerializer = {
  prefix: PROJECTS_SYNC_PREFIX,
  table: projects,
  serialize: ({ row }: { row: Record<string, unknown> }) => row,
};
