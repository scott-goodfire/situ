import type { AgentSessionRecord } from "@situ/agent-sessions";
import { SYSTEM_ACTOR } from "@situ/common";

import type { AppActions } from "../actions";
import type { AppRepositories } from "../actions/repositories";
import type { ManagedAgentsRuntime } from "../managed-agents";

export type RunSchedulerTickInput = {
  actions: AppActions;
  managedAgents: ManagedAgentsRuntime;
  repositories: AppRepositories;
};

export type SchedulerTickResult = {
  skipped: number;
  woken: AgentSessionRecord[];
};

/**
 * Runs one scheduler scan.
 */
export const runSchedulerTick = ({
  actions,
  managedAgents,
  repositories,
}: RunSchedulerTickInput): SchedulerTickResult => {
  const wakeableNotifications = repositories.notifications.listWakeable();
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

    woken.push(
      managedAgents.wakeClaudeAgent({
        agentId: notification.recipient.actorId,
        notificationId: notification.id,
        target: notification.target,
      }),
    );
  }

  return {
    skipped,
    woken,
  };
};
