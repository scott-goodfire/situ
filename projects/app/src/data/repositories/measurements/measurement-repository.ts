import { and, desc, eq, type SQL } from "drizzle-orm";
import { isPlainObject } from "lodash-es";

import { getDb } from "../../db/client";
import { measurements } from "../../db/schema";
import { runSyncedWrite } from "../../db/sync";
import { clampRepositoryLimit, matchesRepositorySearch, PreconditionError } from "../__shared__";

type MeasurementRecord = typeof measurements.$inferSelect;
type MetricScalar = boolean | number | string;
type MetricDirection = "higher_is_better" | "lower_is_better" | "target" | "informational";

export type MeasurementMetricValue = {
  value: MetricScalar;
  unit?: string;
  direction?: MetricDirection;
  notes?: string;
};

export type MeasurementPayload = Record<string, unknown> & {
  activityType?: string;
  measurementType?: string;
  summary?: string;
  command?: string;
  workspaceState?: Record<string, unknown>;
  metrics?: Record<string, MeasurementMetricValue | MetricScalar>;
  rawOutputSummary?: string;
  artifactIds?: string[];
  comparisonBaselineId?: string;
  comparisonMeasurementId?: string;
  comparisonMetricDeltas?: Record<string, MeasurementMetricValue | MetricScalar>;
};

export const measurementRepository = {
  async record({
    body,
    actor = "scientist",
    createdByResearchTaskId,
    createdByAgentId,
    evaluationId,
    payload = {},
  }: {
    body: string;
    actor?: string;
    createdByResearchTaskId?: string;
    createdByAgentId?: string;
    evaluationId: string;
    payload?: MeasurementPayload;
  }): Promise<MeasurementRecord> {
    if (!evaluationId.trim()) {
      throw new PreconditionError({
        code: "measurement_evaluation_required",
        hint: "Create an Evaluation first via evaluationRepository.create and pass its id as evaluationId.",
        details: { evaluationId },
      });
    }
    const measurementId = crypto.randomUUID();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(measurements)
          .values({
            id: measurementId,
            body,
            actor,
            createdByResearchTaskId,
            createdByAgentId,
            evaluationId,
            payloadJson: JSON.stringify(normalizeMeasurementPayload({ payload })),
            syncVersion,
            syncDeleted: false,
          })
          .run();
      },
    });
    return measurementRepository.require({ measurementId });
  },

  async get({ measurementId }: { measurementId: string }): Promise<MeasurementRecord | undefined> {
    return getDb().query.measurements.findFirst({
      where: eq(measurements.id, measurementId),
    });
  },

  async require({ measurementId }: { measurementId: string }): Promise<MeasurementRecord> {
    const measurement = await measurementRepository.get({ measurementId });
    if (!measurement) {
      throw new PreconditionError({
        code: "measurement_not_found",
        hint: "List or search measurements; this id may be abbreviated or stale.",
        details: { measurementId },
      });
    }
    return measurement;
  },

  async list({
    limit = 10,
  }: {
    limit?: number;
  } = {}): Promise<MeasurementRecord[]> {
    const rows = await getDb()
      .select()
      .from(measurements)
      .orderBy(desc(measurements.createdAt), desc(measurements.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async search({
    query,
    evaluationId,
    researchTaskId,
    limit = 10,
  }: {
    query?: string;
    evaluationId?: string;
    researchTaskId?: string;
    limit?: number;
  } = {}): Promise<MeasurementRecord[]> {
    const predicates: SQL[] = [];
    if (evaluationId) {
      predicates.push(eq(measurements.evaluationId, evaluationId));
    }
    if (researchTaskId) {
      predicates.push(eq(measurements.createdByResearchTaskId, researchTaskId));
    }

    const rows = await getDb()
      .select()
      .from(measurements)
      .where(predicates.length > 0 ? and(...predicates) : undefined)
      .orderBy(desc(measurements.createdAt), desc(measurements.id));
    return rows
      .filter((measurement) =>
        matchesRepositorySearch({
          query,
          values: [
            measurement.id,
            measurement.body,
            measurement.actor,
            measurement.createdByResearchTaskId,
            measurement.createdByAgentId,
            measurement.evaluationId,
            measurement.payloadJson,
          ],
        }),
      )
      .slice(0, clampRepositoryLimit({ limit }));
  },
};

export function normalizeMeasurementPayload({
  payload,
}: {
  payload: MeasurementPayload;
}): MeasurementPayload {
  return {
    ...payload,
    metrics: normalizeMetricMap({ metrics: payload.metrics }),
    comparisonMetricDeltas: normalizeMetricMap({
      metrics: payload.comparisonMetricDeltas,
    }),
  };
}

function normalizeMetricMap({
  metrics,
}: {
  metrics?: Record<string, MeasurementMetricValue | MetricScalar>;
}): Record<string, MeasurementMetricValue> {
  if (!metrics) {
    return {};
  }
  const normalized: Record<string, MeasurementMetricValue> = {};
  for (const [key, metric] of Object.entries(metrics)) {
    normalized[key] =
      isPlainObject(metric) && "value" in (metric as Record<string, unknown>)
        ? (metric as MeasurementMetricValue)
        : { value: metric as MetricScalar };
  }
  return normalized;
}
