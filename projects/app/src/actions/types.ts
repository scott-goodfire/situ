import type { ActorRef, IdPrefix, IsoTimestamp, TargetRef } from "@situ/common";
import type { AgentSessionStatus } from "@situ/agent-sessions";
import type { ArtifactType } from "@situ/artifacts";
import type { ExperimentStatus } from "@situ/experiments";
import type { NotificationType } from "@situ/notifications";
import type { ProjectStatus } from "@situ/projects";
import type { ReviewStatus } from "@situ/reviews";
import type { LabelRecord, TaskStatus, TaskType } from "@situ/tasks";
import type { WorkspaceCommandResult } from "@situ/worktrees";

import type { AppDatabase } from "../db";

export type IdFactory = (prefix: IdPrefix) => string;
export type Clock = () => IsoTimestamp;

export type CreateAppActionsInput = {
  createId?: IdFactory;
  db: AppDatabase;
  now?: Clock;
};

export type CreateProjectInput = {
  actor?: ActorRef;
  goalMarkdown: string;
  id?: string;
  status?: ProjectStatus;
};

export type ProjectSummaryPatch = {
  blockersSummary?: string;
  confidenceSummary?: string;
  currentAnswerSummary?: string;
  currentBaselineSummary?: string;
  finalResultSummary?: string;
  openQuestionsSummary?: string;
  progressCheckpointsSummary?: string;
};

export type UpdateProjectSummariesInput = {
  actor?: ActorRef;
  projectId: string;
  summaries: ProjectSummaryPatch;
};

export type CreateFinalReportInput = {
  actor?: ActorRef;
  projectId: string;
  reportMarkdown: string;
  summaryMarkdown: string;
  title?: string;
  uri?: string;
};

export type CreateTaskInput = {
  actor?: ActorRef;
  assignee?: ActorRef;
  bodyMarkdown: string;
  id?: string;
  labelIds?: string[];
  parentTaskId?: string;
  priority?: number;
  projectId: string;
  status?: TaskStatus;
  target?: TargetRef;
  title: string;
  type?: TaskType;
};

export type CreateAgentInput = {
  actor?: ActorRef;
  id?: string;
  instructionsMarkdown: string;
  name: string;
  role: string;
  status?: "active" | "paused" | "disabled";
};

export type CreateAgentSessionInput = {
  agentId: string;
  context?: TargetRef;
  currentNotificationId?: string;
  id?: string;
  parentAgentSessionId?: string;
  remoteClaudeAgentId?: string;
  remoteClaudeSessionId?: string;
  remoteClaudeThreadId?: string;
  status?: AgentSessionStatus;
};

export type UpdateAgentSessionStatusInput = {
  actor?: ActorRef;
  agentSessionId: string;
  currentNotificationId?: string;
  remoteEventCursor?: string;
  status: AgentSessionStatus;
};

export type CreateLabelInput = Pick<LabelRecord, "color" | "name"> & {
  id?: string;
};

export type CreateExperimentInput = {
  actor?: ActorRef;
  baseCommit: string;
  currentCandidateCommit: string;
  id?: string;
  parentExperimentId?: string;
  projectId: string;
  summaryMarkdown: string;
  taskId?: string;
  title: string;
  worktreePath: string;
};

export type UpdateExperimentStatusInput = {
  actor?: ActorRef;
  experimentId: string;
  status: ExperimentStatus;
};

export type CaptureCandidateCommitInput = {
  actor?: ActorRef;
  currentCandidateCommit: string;
  experimentId: string;
};

export type CommandMeasurementInput = {
  name: string;
  summaryMarkdown: string;
  unit?: string;
  value: Record<string, unknown>;
};

export type RunExperimentCommandInput = {
  actor?: ActorRef;
  args?: string[];
  command: string;
  cwd?: string;
  env?: Record<string, string | undefined>;
  experimentId: string;
  measurements?: CommandMeasurementInput[];
  taskId?: string;
  timeoutMs?: number;
};

export type RunExperimentCommandResult = {
  command: WorkspaceCommandResult;
  artifactIds: string[];
  measurementIds: string[];
};

export type CreateMeasurementInput = {
  actor?: ActorRef;
  id?: string;
  name: string;
  observedCommit?: string;
  projectId: string;
  summaryMarkdown: string;
  target: TargetRef;
  unit?: string;
  value: Record<string, unknown>;
};

export type CreateArtifactInput = {
  actor?: ActorRef;
  experimentId?: string;
  id?: string;
  mediaType?: string;
  projectId: string;
  sourceCommit?: string;
  summaryMarkdown: string;
  target: TargetRef;
  taskId?: string;
  title: string;
  type: ArtifactType;
  uri: string;
};

export type CreateReviewInput = {
  actor?: ActorRef;
  citedArtifactIds?: string[];
  citedMeasurementIds?: string[];
  commentMarkdown?: string;
  id?: string;
  notifyActor?: ActorRef;
  projectId: string;
  rationaleMarkdown: string;
  reviewedCommit?: string;
  status: ReviewStatus;
  target: TargetRef;
};

export type AssignTaskInput = {
  actor?: ActorRef;
  assignee: ActorRef;
  taskId: string;
};

export type UpdateTaskStatusInput = {
  actor?: ActorRef;
  commentMarkdown?: string;
  status: TaskStatus;
  taskId: string;
};

export type CreateCommentInput = {
  actor?: ActorRef;
  bodyMarkdown: string;
  citedTargets?: TargetRef[];
  id?: string;
  target: TargetRef;
};

export type NotificationInput = {
  actor?: ActorRef;
  notificationId: string;
};

export type RecordNotificationDeliveryAttemptInput = NotificationInput;

export type SnoozeNotificationInput = NotificationInput & {
  snoozedUntil: IsoTimestamp;
};

export type AppActionNotificationType = NotificationType;
