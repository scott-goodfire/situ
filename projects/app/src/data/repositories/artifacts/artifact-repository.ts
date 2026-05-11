import { desc, eq } from "drizzle-orm";

import { getDb } from "../../db/client";
import { artifacts } from "../../db/schema";
import { runSyncedWrite } from "../../db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import { clampRepositoryLimit, matchesRepositorySearch } from "../__shared__";

type ArtifactRecord = typeof artifacts.$inferSelect;

type CreateArtifactInput = {
  title: string;
  path?: string;
  kind: string;
  entityKind: string;
  entityId: string;
  createdByResearchTaskId?: string;
  createdByAgentId?: string;
  body?: string;
  mediaType?: string;
  sizeBytes?: number;
};

type ArtifactIdInput = {
  artifactId: string;
};

type ListArtifactsInput = {
  limit?: number;
};

type SearchArtifactsInput = {
  query?: string;
  entityKind?: string;
  entityId?: string;
  kind?: string;
  limit?: number;
};

async function getArtifactRecord({
  artifactId,
}: ArtifactIdInput): Promise<ArtifactRecord | undefined> {
  return getDb().query.artifacts.findFirst({
    where: eq(artifacts.id, artifactId),
  });
}

async function requireArtifactRecord({ artifactId }: ArtifactIdInput): Promise<ArtifactRecord> {
  const artifact = await getArtifactRecord({ artifactId });
  if (!artifact) {
    throw new Error(`Artifact not found: ${artifactId}`);
  }
  return artifact;
}

export const artifactRepository = {
  async create({
    title,
    path,
    kind,
    entityKind,
    entityId,
    createdByResearchTaskId,
    createdByAgentId,
    body = "",
    mediaType,
    sizeBytes,
  }: CreateArtifactInput): Promise<ArtifactRecord> {
    const artifactId = crypto.randomUUID();
    const artifactPath = path?.trim() || inlineArtifactPath({ artifactId });
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(artifacts)
          .values({
            id: artifactId,
            title,
            path: artifactPath,
            kind,
            body,
            entityKind,
            entityId,
            createdByResearchTaskId,
            createdByAgentId,
            mediaType,
            sizeBytes,
            syncVersion,
            syncDeleted: false,
            createdAt: now,
          })
          .run();
      },
    });
    return requireArtifactRecord({ artifactId });
  },

  async get({ artifactId }: ArtifactIdInput): Promise<ArtifactRecord | undefined> {
    return getArtifactRecord({ artifactId });
  },

  async require({ artifactId }: ArtifactIdInput): Promise<ArtifactRecord> {
    return requireArtifactRecord({ artifactId });
  },

  async list({ limit = 10 }: ListArtifactsInput = {}): Promise<ArtifactRecord[]> {
    const rows = await getDb()
      .select()
      .from(artifacts)
      .orderBy(desc(artifacts.createdAt), desc(artifacts.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async search({
    query,
    entityKind,
    entityId,
    kind,
    limit = 10,
  }: SearchArtifactsInput = {}): Promise<ArtifactRecord[]> {
    const rows = await getDb()
      .select()
      .from(artifacts)
      .orderBy(desc(artifacts.createdAt), desc(artifacts.id));
    const filtered = rows.filter((artifact) => {
      if (entityKind && artifact.entityKind !== entityKind) {
        return false;
      }
      if (entityId && artifact.entityId !== entityId) {
        return false;
      }
      if (kind && artifact.kind !== kind) {
        return false;
      }
      return matchesRepositorySearch({
        query,
        values: [
          artifact.id,
          artifact.title,
          artifact.path,
          artifact.body,
          artifact.kind,
          artifact.entityKind,
          artifact.entityId,
          artifact.createdByResearchTaskId,
          artifact.createdByAgentId,
          artifact.mediaType,
          artifact.sizeBytes,
        ],
      });
    });
    return filtered.slice(0, clampRepositoryLimit({ limit }));
  },
};

function inlineArtifactPath({ artifactId }: { artifactId: string }): string {
  return `inline/${artifactId}.md`;
}
