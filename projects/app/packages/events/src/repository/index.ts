import type { EventRecord } from "../types";

export type EventRepository = {
  create(event: EventRecord): Promise<EventRecord>;
  listByTarget(targetId: string): Promise<EventRecord[]>;
};
