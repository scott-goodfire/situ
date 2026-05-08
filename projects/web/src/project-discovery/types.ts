export type ProjectSessionStatus =
  | "running"
  | "stopped"
  | "unhealthy"
  | "missing_workspace"
  | "stale";

export type ProjectSummary = {
  project_id: string;
  workspace_id: string | null;
  label: string;
  workspace: string | null;
  objective_title: string | null;
  status: ProjectSessionStatus;
  status_reason: string | null;
  started_at: string | null;
  last_seen_at: string | null;
  url: string | null;
};

export type SessionConnection = {
  project_id: string;
  workspace_id: string;
  workspace: string;
  started_at: string;
};

export type ProjectListResponse = {
  projects: ProjectSummary[];
};

export type ProjectResponse = {
  project: ProjectSummary | null;
};

export type ProjectSessionResponse = {
  project: ProjectSummary | null;
  session: SessionConnection | null;
};
