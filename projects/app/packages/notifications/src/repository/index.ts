import { nowIso } from "@situ/common";
import { NotFoundError } from "@situ/errors";
import { and, desc, eq, isNull, lte, or } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { notifications, type NewNotificationRow, type NotificationRow } from "../schema";
import type { NotificationRecord } from "../types";

export type CreateNotificationRepositoryInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

export type NotificationByIdInput = {
  id: string;
};

export type NotificationByRecipientInput = {
  recipientId: string;
};

export type NotificationWriteInput = {
  notification: NotificationRecord;
};

export type NotificationRepository = {
  create(input: NotificationWriteInput): NotificationRecord;
  findOpenEquivalent(input: NotificationWriteInput): NotificationRecord | undefined;
  get(input: NotificationByIdInput): NotificationRecord | undefined;
  require(input: NotificationByIdInput): NotificationRecord;
  listRecentByRecipient(input: NotificationByRecipientInput): NotificationRecord[];
  listWakeableByRecipient(input: NotificationByRecipientInput): NotificationRecord[];
  update(input: NotificationWriteInput): NotificationRecord;
};

type NotificationRecordInput = {
  notification: NotificationRecord;
};

type NotificationRowInput = {
  row: NotificationRow;
};

const encodeNotification = ({ notification }: NotificationRecordInput): NewNotificationRow => ({
  id: notification.id,
  recipientActorKind: notification.recipient.actorKind,
  recipientActorId: notification.recipient.actorId,
  type: notification.type,
  targetKind: notification.target.targetKind,
  targetId: notification.target.targetId,
  title: notification.title,
  bodyMarkdown: notification.bodyMarkdown ?? null,
  readAt: notification.readAt ?? null,
  dismissedAt: notification.dismissedAt ?? null,
  snoozedUntil: notification.snoozedUntil ?? null,
  deliveryAttemptedAt: notification.deliveryAttemptedAt ?? null,
  createdAt: notification.createdAt,
});

const decodeNotification = ({ row }: NotificationRowInput): NotificationRecord => ({
  id: row.id,
  recipient: {
    actorKind: row.recipientActorKind,
    actorId: row.recipientActorId,
  },
  type: row.type,
  target: {
    targetKind: row.targetKind,
    targetId: row.targetId,
  },
  title: row.title,
  bodyMarkdown: row.bodyMarkdown ?? undefined,
  readAt: row.readAt ?? undefined,
  dismissedAt: row.dismissedAt ?? undefined,
  snoozedUntil: row.snoozedUntil ?? undefined,
  deliveryAttemptedAt: row.deliveryAttemptedAt ?? undefined,
  createdAt: row.createdAt,
});

/** Creates the repository for notification persistence. */
export const createNotificationRepository = ({
  db,
}: CreateNotificationRepositoryInput): NotificationRepository => {
  const repository: NotificationRepository = {
    create({ notification }) {
      db.insert(notifications).values(encodeNotification({ notification })).run();
      return notification;
    },

    findOpenEquivalent({ notification }) {
      const row = db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientActorKind, notification.recipient.actorKind),
            eq(notifications.recipientActorId, notification.recipient.actorId),
            eq(notifications.type, notification.type),
            eq(notifications.targetKind, notification.target.targetKind),
            eq(notifications.targetId, notification.target.targetId),
            isNull(notifications.readAt),
            isNull(notifications.dismissedAt),
          ),
        )
        .get();

      if (row === undefined) {
        return undefined;
      }

      return decodeNotification({ row });
    },

    get({ id }) {
      const row = db.select().from(notifications).where(eq(notifications.id, id)).get();

      if (row === undefined) {
        return undefined;
      }

      return decodeNotification({ row });
    },

    require({ id }) {
      const notification = repository.get({ id });

      if (notification === undefined) {
        throw new NotFoundError({
          details: {
            id,
            resource: "Notification",
          },
          message: `Notification not found: ${id}`,
        });
      }

      return notification;
    },

    listRecentByRecipient({ recipientId }) {
      return db
        .select()
        .from(notifications)
        .where(eq(notifications.recipientActorId, recipientId))
        .orderBy(desc(notifications.createdAt))
        .all()
        .map((row) => decodeNotification({ row }));
    },

    listWakeableByRecipient({ recipientId }) {
      const timestamp = nowIso();

      return db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientActorId, recipientId),
            isNull(notifications.readAt),
            isNull(notifications.dismissedAt),
            or(isNull(notifications.snoozedUntil), lte(notifications.snoozedUntil, timestamp)),
          ),
        )
        .orderBy(desc(notifications.createdAt))
        .all()
        .map((row) => decodeNotification({ row }));
    },

    update({ notification }) {
      db.update(notifications)
        .set(encodeNotification({ notification }))
        .where(eq(notifications.id, notification.id))
        .run();

      return repository.require({ id: notification.id });
    },
  };

  return repository;
};
