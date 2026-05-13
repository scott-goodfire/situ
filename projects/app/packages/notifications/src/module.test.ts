import { expect, test } from "bun:test";

import { isWakeableNotification, NOTIFICATION_TYPES, notificationsModule } from ".";

test("exports notification module metadata", () => {
  expect(notificationsModule.name).toBe("@situ/notifications");
  expect(NOTIFICATION_TYPES).toContain("changes_requested");
});

test("wakeable notifications are unread, undismissed, and unsnoozed", () => {
  expect(
    isWakeableNotification({
      notification: {
        readAt: undefined,
        dismissedAt: undefined,
      },
    }),
  ).toBe(true);
  expect(
    isWakeableNotification({
      notification: {
        readAt: "2026-05-12T00:00:00.000Z",
        dismissedAt: undefined,
      },
    }),
  ).toBe(false);
});
