import type { ProjectRecord } from "../types";

export type ProjectRepository = {
  get(id: string): Promise<ProjectRecord | undefined>;
  require(id: string): Promise<ProjectRecord>;
};
