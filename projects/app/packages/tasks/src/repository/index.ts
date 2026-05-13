import type { TaskRecord } from "../types";

export type TaskRepository = {
  get(id: string): Promise<TaskRecord | undefined>;
  require(id: string): Promise<TaskRecord>;
  listByProject(projectId: string): Promise<TaskRecord[]>;
};
