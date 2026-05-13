import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { NotFoundError } from "@situ/errors";

import { experiments, type ExperimentRow } from "../schema";
import type { ExperimentRecord } from "../types";

export type CreateExperimentRepositoryInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

export type ExperimentByIdInput = {
  id: string;
};

export type ExperimentsByProjectInput = {
  projectId: string;
};

export type ExperimentWriteInput = {
  experiment: ExperimentRecord;
};

export type ExperimentRepository = {
  create(input: ExperimentWriteInput): ExperimentRecord;
  get(input: ExperimentByIdInput): ExperimentRecord | undefined;
  listByProject(input: ExperimentsByProjectInput): ExperimentRecord[];
  require(input: ExperimentByIdInput): ExperimentRecord;
  update(input: ExperimentWriteInput): ExperimentRecord;
};

const encodeExperiment = ({ experiment }: ExperimentWriteInput) => ({
  ...experiment,
  taskId: experiment.taskId,
  parentExperimentId: experiment.parentExperimentId,
});

const decodeExperiment = ({ row }: { row: ExperimentRow }): ExperimentRecord => ({
  id: row.id,
  syncVersion: row.syncVersion,
  syncDeleted: row.syncDeleted,
  projectId: row.projectId,
  taskId: row.taskId ?? undefined,
  parentExperimentId: row.parentExperimentId ?? undefined,
  title: row.title,
  summaryMarkdown: row.summaryMarkdown,
  worktreePath: row.worktreePath,
  baseCommit: row.baseCommit,
  currentCandidateCommit: row.currentCandidateCommit,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/**
 * Creates an experiment repository.
 */
export const createExperimentRepository = ({
  db,
}: CreateExperimentRepositoryInput): ExperimentRepository => {
  const repository: ExperimentRepository = {
    create({ experiment }) {
      db.insert(experiments).values(encodeExperiment({ experiment })).run();
      return experiment;
    },

    get({ id }) {
      const row = db.select().from(experiments).where(eq(experiments.id, id)).get();

      if (row === undefined) {
        return undefined;
      }

      return decodeExperiment({ row });
    },

    listByProject({ projectId }) {
      return db
        .select()
        .from(experiments)
        .where(eq(experiments.projectId, projectId))
        .all()
        .map((row) => decodeExperiment({ row }));
    },

    require({ id }) {
      const experiment = repository.get({ id });

      if (experiment !== undefined) {
        return experiment;
      }

      throw new NotFoundError({
        details: {
          id,
          resource: "Experiment",
        },
        message: `Experiment not found: ${id}`,
      });
    },

    update({ experiment }) {
      db.update(experiments)
        .set(encodeExperiment({ experiment }))
        .where(eq(experiments.id, experiment.id))
        .run();

      return experiment;
    },
  };

  return repository;
};
