export const TARGET_KINDS = [
  "project",
  "task",
  "comment",
  "notification",
  "experiment",
  "measurement",
  "review",
  "artifact",
  "agent",
  "agent_session",
  "event",
] as const;

export type TargetKind = (typeof TARGET_KINDS)[number];

export type TargetRef = {
  targetKind: TargetKind;
  targetId: string;
};

export const isKnownTargetKind = (value: string): value is TargetKind =>
  TARGET_KINDS.includes(value as TargetKind);
