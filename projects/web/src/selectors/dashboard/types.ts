export type DashboardTaskStatus = "todo" | "in-progress" | "done";

export type DashboardTaskKind =
  | "task"
  | "experiment"
  | "hypothesis"
  | "evaluation"
  | "concern";

export type DashboardTone = "neutral" | "info" | "warning" | "success" | "danger";

export type DashboardTask = {
  id: string;
  title: string;
  status: DashboardTaskStatus;
  kind: DashboardTaskKind;
  tone: DashboardTone;
};

export type ActivityFeedRow = {
  id: string;
  label: string;
  body: string;
  tone: DashboardTone;
  createdAt: string;
};
