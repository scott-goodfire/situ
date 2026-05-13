import { createSyncMetadata } from "@situ/common";
import type { EventRecord } from "@situ/events";

import type { AppRepositories } from "./repositories";
import type { Clock, IdFactory } from "./types";

export type RecordEventInput = {
  createId: IdFactory;
  event: Omit<EventRecord, "createdAt" | "id" | "syncDeleted" | "syncVersion">;
  now: Clock;
  repositories: AppRepositories;
};

/**
 * Records an event.
 */
export const recordEvent = ({
  createId,
  event,
  now,
  repositories,
}: RecordEventInput): EventRecord =>
  repositories.events.create({
    event: {
      ...event,
      id: createId("event"),
      ...createSyncMetadata(),
      createdAt: now(),
    },
  });
