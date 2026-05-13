import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { NotFoundError } from "@situ/errors";

import { projects } from "../schema";
import type { ProjectRecord } from "../types";

export type CreateProjectRepositoryInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

export type ProjectByIdInput = {
  id: string;
};

export type ProjectWriteInput = {
  project: ProjectRecord;
};

export type ProjectRepository = {
  create(input: ProjectWriteInput): ProjectRecord;
  get(input: ProjectByIdInput): ProjectRecord | undefined;
  require(input: ProjectByIdInput): ProjectRecord;
  update(input: ProjectWriteInput): ProjectRecord;
};

/**
 * Creates a project repository.
 */
export const createProjectRepository = ({
  db,
}: CreateProjectRepositoryInput): ProjectRepository => {
  const repository: ProjectRepository = {
    create({ project }) {
      db.insert(projects).values(project).run();
      return project;
    },

    get({ id }) {
      return db.select().from(projects).where(eq(projects.id, id)).get();
    },

    require({ id }) {
      const project = repository.get({ id });

      if (project === undefined) {
        throw new NotFoundError({
          details: {
            id,
            resource: "Project",
          },
          message: `Project not found: ${id}`,
        });
      }

      return project;
    },

    update({ project }) {
      db.update(projects).set(project).where(eq(projects.id, project.id)).run();
      return repository.require({ id: project.id });
    },
  };

  return repository;
};
