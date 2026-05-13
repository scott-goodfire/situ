import type { ActorRef, IsoTimestamp, SyncMetadata, TargetRef } from "@situ/common";

export const TASK_STATUSES = [
  "triage",
  "backlog",
  "in_progress",
  "in_review",
  "done",
  "blocked",
  "rejected",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_TYPES = [
  "coordination",
  "investigation",
  "implementation",
  "measurement",
  "review",
  "report",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export type LabelRecord = SyncMetadata & {
  id: string;
  name: string;
  color?: string;
  archivedAt?: IsoTimestamp;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};

export type TaskRecord = SyncMetadata & {
  id: string;
  projectId: string;
  title: string;
  bodyMarkdown: string;
  status: TaskStatus;
  type: TaskType;
  priority: number;
  creator: ActorRef;
  assignee?: ActorRef;
  activeAgentSessionId?: string;
  parentTaskId?: string;
  target?: TargetRef;
  labelIds: string[];
  lastActivityAt: IsoTimestamp;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};
