# `@situ/notifications`

Actor inbox items that wake sleeping agents.

## Local Commands

```bash
mise run check
mise run test
mise run coverage
```

## Purpose

This package owns the `Notification` primitive. Notifications are inbox state,
not workflow jobs.

## Inbox State

Notifications distinguish seen state from cleared state:

- `readAt`: recipient saw or loaded the notification
- `dismissedAt`: recipient cleared the notification from its inbox
- `snoozedUntil`: notification is hidden from wake scans until a time

Wake scans use unread, undismissed, unsnoozed notifications.
