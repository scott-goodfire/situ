import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { NotFoundError } from "@situ/errors";

import { measurements, type MeasurementRow } from "../schema";
import type { MeasurementRecord } from "../types";

export type CreateMeasurementRepositoryInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

export type MeasurementByIdInput = {
  id: string;
};

export type MeasurementsByProjectInput = {
  projectId: string;
};

export type MeasurementWriteInput = {
  measurement: MeasurementRecord;
};

export type MeasurementRepository = {
  create(input: MeasurementWriteInput): MeasurementRecord;
  get(input: MeasurementByIdInput): MeasurementRecord | undefined;
  listByProject(input: MeasurementsByProjectInput): MeasurementRecord[];
  require(input: MeasurementByIdInput): MeasurementRecord;
};

const encodeMeasurement = ({ measurement }: MeasurementWriteInput) => ({
  id: measurement.id,
  syncVersion: measurement.syncVersion,
  syncDeleted: measurement.syncDeleted,
  projectId: measurement.projectId,
  targetKind: measurement.target.targetKind,
  targetId: measurement.target.targetId,
  name: measurement.name,
  valueJson: JSON.stringify(measurement.value),
  unit: measurement.unit,
  summaryMarkdown: measurement.summaryMarkdown,
  observedCommit: measurement.observedCommit,
  measuredByActorKind: measurement.measuredBy.actorKind,
  measuredByActorId: measurement.measuredBy.actorId,
  createdAt: measurement.createdAt,
});

const decodeMeasurement = ({ row }: { row: MeasurementRow }): MeasurementRecord => ({
  id: row.id,
  syncVersion: row.syncVersion,
  syncDeleted: row.syncDeleted,
  projectId: row.projectId,
  target: {
    targetKind: row.targetKind,
    targetId: row.targetId,
  },
  name: row.name,
  value: JSON.parse(row.valueJson) as Record<string, unknown>,
  unit: row.unit ?? undefined,
  summaryMarkdown: row.summaryMarkdown,
  observedCommit: row.observedCommit ?? undefined,
  measuredBy: {
    actorKind: row.measuredByActorKind,
    actorId: row.measuredByActorId,
  },
  createdAt: row.createdAt,
});

/**
 * Creates a measurement repository.
 */
export const createMeasurementRepository = ({
  db,
}: CreateMeasurementRepositoryInput): MeasurementRepository => {
  const repository: MeasurementRepository = {
    create({ measurement }) {
      db.insert(measurements).values(encodeMeasurement({ measurement })).run();
      return measurement;
    },

    get({ id }) {
      const row = db.select().from(measurements).where(eq(measurements.id, id)).get();

      if (row === undefined) {
        return undefined;
      }

      return decodeMeasurement({ row });
    },

    listByProject({ projectId }) {
      return db
        .select()
        .from(measurements)
        .where(eq(measurements.projectId, projectId))
        .all()
        .map((row) => decodeMeasurement({ row }));
    },

    require({ id }) {
      const measurement = repository.get({ id });

      if (measurement !== undefined) {
        return measurement;
      }

      throw new NotFoundError({
        details: {
          id,
          resource: "Measurement",
        },
        message: `Measurement not found: ${id}`,
      });
    },
  };

  return repository;
};
