import type { AppActions } from "../actions";
import type { AppRepositories } from "../actions/repositories";
import type {
  CreateArtifactInput,
  CreateCommentInput,
  CreateExperimentInput,
  CreateMeasurementInput,
  CreateReviewInput,
  NotificationInput,
  SnoozeNotificationInput,
} from "../actions/types";

export type CreateAgentToolsInput = {
  actions: AppActions;
  repositories: AppRepositories;
};

export type ListInboxInput = {
  agentId: string;
};

export type ListEventsInput = {
  targetId: string;
};

/**
 * Creates thin agent tools.
 */
export const createAgentTools = ({ actions, repositories }: CreateAgentToolsInput) => ({
  createArtifact(input: CreateArtifactInput) {
    return actions.createArtifact(input);
  },

  createComment(input: CreateCommentInput) {
    return actions.createComment(input);
  },

  createExperiment(input: CreateExperimentInput) {
    return actions.createExperiment(input);
  },

  createMeasurement(input: CreateMeasurementInput) {
    return actions.createMeasurement(input);
  },

  createReview(input: CreateReviewInput) {
    return actions.createReview(input);
  },

  dismissNotification(input: NotificationInput) {
    return actions.dismissNotification(input);
  },

  listEvents({ targetId }: ListEventsInput) {
    return repositories.events.listByTarget({ targetId });
  },

  listInbox({ agentId }: ListInboxInput) {
    return repositories.notifications.listWakeableByRecipient({
      recipientId: agentId,
    });
  },

  markNotificationRead(input: NotificationInput) {
    return actions.markNotificationRead(input);
  },

  markNotificationUnread(input: NotificationInput) {
    return actions.markNotificationUnread(input);
  },

  snoozeNotification(input: SnoozeNotificationInput) {
    return actions.snoozeNotification(input);
  },
});

export type AgentTools = ReturnType<typeof createAgentTools>;
