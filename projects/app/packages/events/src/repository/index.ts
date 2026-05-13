import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { NotFoundError } from "@situ/errors";

import { events, type EventRow, type NewEventRow } from "../schema";
import type { EventRecord } from "../types";

export type CreateEventRepositoryInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

export type EventByIdInput = {
  id: string;
};

export type EventsByTargetInput = {
  targetId: string;
};

export type EventWriteInput = {
  event: EventRecord;
};

export type EventRepository = {
  create(input: EventWriteInput): EventRecord;
  get(input: EventByIdInput): EventRecord | undefined;
  listByTarget(input: EventsByTargetInput): EventRecord[];
  require(input: EventByIdInput): EventRecord;
};

type EventRecordInput = {
  event: EventRecord;
};

type EventRowInput = {
  row: EventRow;
};

const encodeEvent = ({ event }: EventRecordInput): NewEventRow => ({
  id: event.id,
  type: event.type,
  actorKind: event.actor.actorKind,
  actorId: event.actor.actorId,
  targetKind: event.target.targetKind,
  targetId: event.target.targetId,
  message: event.message,
  payloadJson: JSON.stringify(event.payload),
  createdAt: event.createdAt,
});

const decodeEvent = ({ row }: EventRowInput): EventRecord => ({
  id: row.id,
  type: row.type,
  actor: {
    actorKind: row.actorKind,
    actorId: row.actorId,
  },
  target: {
    targetKind: row.targetKind,
    targetId: row.targetId,
  },
  message: row.message,
  payload: JSON.parse(row.payloadJson) as Record<string, unknown>,
  createdAt: row.createdAt,
});

/**
 * Creates an event repository.
 */
export const createEventRepository = ({ db }: CreateEventRepositoryInput): EventRepository => {
  const repository: EventRepository = {
    create({ event }) {
      db.insert(events).values(encodeEvent({ event })).run();
      return event;
    },

    get({ id }) {
      const row = db.select().from(events).where(eq(events.id, id)).get();

      if (row === undefined) {
        return undefined;
      }

      return decodeEvent({ row });
    },

    listByTarget({ targetId }) {
      return db
        .select()
        .from(events)
        .where(eq(events.targetId, targetId))
        .all()
        .map((row) => decodeEvent({ row }));
    },

    require({ id }) {
      const event = repository.get({ id });

      if (event !== undefined) {
        return event;
      }

      throw new NotFoundError({
        details: {
          id,
          resource: "Event",
        },
        message: `Event not found: ${id}`,
      });
    },
  };

  return repository;
};
