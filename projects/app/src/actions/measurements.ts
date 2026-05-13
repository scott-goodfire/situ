import { createSyncMetadata } from "@situ/common";
import type { MeasurementRecord } from "@situ/measurements";

import { resolveActionActor } from "./actors";
import { recordEvent } from "./events";
import type { AppRepositories } from "./repositories";
import { ensureTargetExists, targetForMeasurement } from "./targets";
import type { Clock, CreateMeasurementInput, IdFactory } from "./types";

export type CreateMeasurementActionInput = {
  createId: IdFactory;
  input: CreateMeasurementInput;
  now: Clock;
  repositories: AppRepositories;
};

/**
 * Creates a measurement.
 */
export const createMeasurementAction = ({
  createId,
  input,
  now,
  repositories,
}: CreateMeasurementActionInput): MeasurementRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const timestamp = now();

  repositories.projects.require({ id: input.projectId });
  ensureTargetExists({
    repositories,
    target: input.target,
  });

  const measurement = repositories.measurements.create({
    measurement: {
      createdAt: timestamp,
      id: input.id ?? createId("measurement"),
      measuredBy: actor,
      name: input.name,
      observedCommit: input.observedCommit,
      projectId: input.projectId,
      summaryMarkdown: input.summaryMarkdown,
      ...createSyncMetadata(),
      target: input.target,
      unit: input.unit,
      value: input.value,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Measurement created",
      payload: {
        measurementId: measurement.id,
        name: measurement.name,
        observedCommit: measurement.observedCommit,
      },
      target: targetForMeasurement({ measurement }),
      type: "measurement.created",
    },
    now,
    repositories,
  });

  return measurement;
};
