export type IdPrefix =
  | "agent"
  | "agent_session"
  | "agent_session_log"
  | "artifact"
  | "comment"
  | "event"
  | "experiment"
  | "label"
  | "measurement"
  | "notification"
  | "project"
  | "review"
  | "task";

export const createId = (prefix: IdPrefix, randomId = () => crypto.randomUUID()): string =>
  `${prefix}_${randomId().replaceAll("-", "")}`;
