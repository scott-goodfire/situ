export type IdPrefix =
  | "agent"
  | "agent_session"
  | "artifact"
  | "comment"
  | "event"
  | "experiment"
  | "measurement"
  | "notification"
  | "project"
  | "review"
  | "task";

export const createId = (prefix: IdPrefix, randomId = crypto.randomUUID): string =>
  `${prefix}_${randomId().replaceAll("-", "")}`;
