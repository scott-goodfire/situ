import type { EventRecord } from "@situ/events";

import type { AppRepositories } from "./repositories";
import type { Clock, IdFactory } from "./types";

export type RecordEventInput = {
  createId: IdFactory;
  event: Omit<EventRecord, "createdAt" | "id">;
  now: Clock;
  repositories: AppRepositories;
};

/** Records an append-only event for product history and debugging. */
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
      createdAt: now(),
    },
  });
