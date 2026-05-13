import type { AgentSessionRecord } from "@situ/agent-sessions";
import { isIsoAtOrBefore, nowIso, SYSTEM_ACTOR, toIsoTimestamp } from "@situ/common";
import { DateTime, type DurationLike } from "luxon";

import type { AppActions } from "../actions";
import type { AppRepositories } from "../actions/repositories";
import type { ManagedAgentsRuntime } from "../managed-agents";

export type RunSchedulerTickInput = {
  actions: AppActions;
  now?: () => string;
  managedAgents: ManagedAgentsRuntime;
  repositories: AppRepositories;
  staleAfter?: DurationLike;
};

export type SchedulerTickResult = {
  recovered: number;
  skipped: number;
  woken: AgentSessionRecord[];
};

const RECOVERABLE_TASK_STATUSES = new Set(["in_progress", "in_review", "blocked"]);

const staleCutoff = ({ now, staleAfter }: { now: string; staleAfter: DurationLike }): string =>
  toIsoTimestamp({
    dateTime: DateTime.fromISO(now, { zone: "utc" }).minus(staleAfter),
  });

const recoverStaleAssignedTasks = ({
  actions,
  cutoff,
  repositories,
}: {
  actions: AppActions;
  cutoff: string;
  repositories: AppRepositories;
}): number => {
  let recovered = 0;

  for (const task of repositories.tasks.listAssignedToAgents()) {
    if (!RECOVERABLE_TASK_STATUSES.has(task.status)) {
      continue;
    }

    if (!isIsoAtOrBefore({ left: task.lastActivityAt, right: cutoff })) {
      continue;
    }

    actions.updateTaskStatus({
      actor: SYSTEM_ACTOR,
      commentMarkdown:
        "Work was returned to the board because the assigned agent had no recent visible activity.",
      status: "backlog",
      taskId: task.id,
    });
    actions.assignTask({
      actor: SYSTEM_ACTOR,
      assignee: SYSTEM_ACTOR,
      taskId: task.id,
    });
    recovered += 1;
  }

  return recovered;
};

const errorMessage = ({ error }: { error: unknown }): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "unknown error";
};

/**
 * Runs one scheduler scan.
 */
export const runSchedulerTick = ({
  actions,
  managedAgents,
  now = nowIso,
  repositories,
  staleAfter = { minutes: 30 },
}: RunSchedulerTickInput): SchedulerTickResult => {
  const cutoff = staleCutoff({
    now: now(),
    staleAfter,
  });
  const wakeableNotifications = repositories.notifications.listWakeable();
  const recovered = recoverStaleAssignedTasks({
    actions,
    cutoff,
    repositories,
  });
  const woken: AgentSessionRecord[] = [];
  let skipped = 0;

  for (const notification of wakeableNotifications) {
    if (notification.recipient.actorKind !== "agent") {
      skipped += 1;
      continue;
    }

    actions.recordNotificationDeliveryAttempt({
      actor: SYSTEM_ACTOR,
      notificationId: notification.id,
    });

    try {
      woken.push(
        managedAgents.wakeClaudeAgent({
          agentId: notification.recipient.actorId,
          notificationId: notification.id,
          target: notification.target,
        }),
      );
    } catch (error) {
      skipped += 1;
      actions.createAgentSession({
        agentId: notification.recipient.actorId,
        context: notification.target,
        currentNotificationId: notification.id,
        status: "failed",
      });
      actions.createComment({
        actor: SYSTEM_ACTOR,
        bodyMarkdown: `Agent wake failed: ${errorMessage({ error })}`,
        target: notification.target,
      });
    }
  }

  return {
    recovered,
    skipped,
    woken,
  };
};
