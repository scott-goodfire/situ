import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { NotFoundError } from "@situ/errors";

import { artifacts, type ArtifactRow } from "../schema";
import type { ArtifactRecord } from "../types";

export type CreateArtifactRepositoryInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

export type ArtifactByIdInput = {
  id: string;
};

export type ArtifactsByProjectInput = {
  projectId: string;
};

export type ArtifactWriteInput = {
  artifact: ArtifactRecord;
};

export type ArtifactRepository = {
  create(input: ArtifactWriteInput): ArtifactRecord;
  get(input: ArtifactByIdInput): ArtifactRecord | undefined;
  listByProject(input: ArtifactsByProjectInput): ArtifactRecord[];
  require(input: ArtifactByIdInput): ArtifactRecord;
};

const encodeArtifact = ({ artifact }: ArtifactWriteInput) => ({
  id: artifact.id,
  syncVersion: artifact.syncVersion,
  syncDeleted: artifact.syncDeleted,
  projectId: artifact.projectId,
  targetKind: artifact.target.targetKind,
  targetId: artifact.target.targetId,
  type: artifact.type,
  title: artifact.title,
  uri: artifact.uri,
  mediaType: artifact.mediaType,
  summaryMarkdown: artifact.summaryMarkdown,
  taskId: artifact.taskId,
  experimentId: artifact.experimentId,
  sourceCommit: artifact.sourceCommit,
  createdByActorKind: artifact.createdBy.actorKind,
  createdByActorId: artifact.createdBy.actorId,
  createdAt: artifact.createdAt,
  updatedAt: artifact.updatedAt,
});

const decodeArtifact = ({ row }: { row: ArtifactRow }): ArtifactRecord => ({
  id: row.id,
  syncVersion: row.syncVersion,
  syncDeleted: row.syncDeleted,
  projectId: row.projectId,
  target: {
    targetKind: row.targetKind,
    targetId: row.targetId,
  },
  type: row.type,
  title: row.title,
  uri: row.uri,
  mediaType: row.mediaType ?? undefined,
  summaryMarkdown: row.summaryMarkdown,
  taskId: row.taskId ?? undefined,
  experimentId: row.experimentId ?? undefined,
  sourceCommit: row.sourceCommit ?? undefined,
  createdBy: {
    actorKind: row.createdByActorKind,
    actorId: row.createdByActorId,
  },
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/**
 * Creates an artifact repository.
 */
export const createArtifactRepository = ({
  db,
}: CreateArtifactRepositoryInput): ArtifactRepository => {
  const repository: ArtifactRepository = {
    create({ artifact }) {
      db.insert(artifacts).values(encodeArtifact({ artifact })).run();
      return artifact;
    },

    get({ id }) {
      const row = db.select().from(artifacts).where(eq(artifacts.id, id)).get();

      if (row === undefined) {
        return undefined;
      }

      return decodeArtifact({ row });
    },

    listByProject({ projectId }) {
      return db
        .select()
        .from(artifacts)
        .where(eq(artifacts.projectId, projectId))
        .all()
        .map((row) => decodeArtifact({ row }));
    },

    require({ id }) {
      const artifact = repository.get({ id });

      if (artifact !== undefined) {
        return artifact;
      }

      throw new NotFoundError({
        details: {
          id,
          resource: "Artifact",
        },
        message: `Artifact not found: ${id}`,
      });
    },
  };

  return repository;
};
