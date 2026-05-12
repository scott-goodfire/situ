import { sql } from "drizzle-orm";
import { type AnySQLiteColumn, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

function syncTracking() {
  return {
    syncVersion: integer("sync_version").notNull().default(1),
    syncDeleted: integer("sync_deleted", { mode: "boolean" }).notNull().default(false),
  };
}

function timestamps() {
  return {
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  };
}

function payloadJson() {
  return {
    payloadJson: text("payload_json").notNull().default("{}"),
  };
}

const PROJECT_PHASES = ["onboarding", "baseline", "search", "reporting", "complete"] as const;
const PROJECT_STATUSES = ["active", "blocked_on_user", "complete", "failed", "canceled"] as const;
const INTERACTION_KINDS = ["question", "baseline_confirmation"] as const;
const INTERACTION_STATUSES = ["pending", "answered", "confirmed", "rejected", "canceled"] as const;
const TASK_TYPES = ["explore", "exploit", "debug", "verify", "synthesize", "prune"] as const;
const TASK_STATUSES = [
  "planned",
  "running",
  "awaiting_verification",
  "verified",
  "rejected",
  "pruned",
  "failed",
  "canceled",
] as const;
const TASK_PRIORITIES = ["urgent", "high", "normal", "low"] as const;
const VERIFICATION_PROFILES = [
  "hypothesis",
  "experiment",
  "measurement",
  "adversarial",
  "report",
  "general",
] as const;
const VERIFICATION_STATUSES = ["passed", "failed", "suspicious", "needs_more_evidence"] as const;

export const researchProjects = sqliteTable(
  "research_projects",
  {
    id: text("id").primaryKey(),
    goal: text("goal").notNull(),
    phase: text("phase", { enum: PROJECT_PHASES }).notNull().default("onboarding"),
    status: text("status", { enum: PROJECT_STATUSES }).notNull().default("active"),
    baselineSummary: text("baseline_summary"),
    resultSummary: text("result_summary"),
    createdByAgentId: text("created_by_agent_id"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    ...payloadJson(),
    ...syncTracking(),
    ...timestamps(),
  },
  (table) => ({
    statusCreatedIdx: index("research_projects_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
  }),
);

export const researchProjectInteractions = sqliteTable(
  "research_project_interactions",
  {
    id: text("id").primaryKey(),
    researchProjectId: text("research_project_id")
      .notNull()
      .references(() => researchProjects.id),
    kind: text("kind", { enum: INTERACTION_KINDS }).notNull(),
    prompt: text("prompt").notNull(),
    details: text("details").notNull().default(""),
    status: text("status", { enum: INTERACTION_STATUSES }).notNull().default("pending"),
    response: text("response"),
    createdByAgentId: text("created_by_agent_id"),
    resolvedAt: text("resolved_at"),
    ...payloadJson(),
    ...syncTracking(),
    ...timestamps(),
  },
  (table) => ({
    statusCreatedIdx: index("research_project_interactions_status_idx").on(
      table.status,
      table.createdAt,
    ),
  }),
);

export const researchTasks = sqliteTable(
  "research_tasks",
  {
    id: text("id").primaryKey(),
    researchProjectId: text("research_project_id")
      .notNull()
      .references(() => researchProjects.id),
    parentResearchTaskId: text("parent_research_task_id").references(
      (): AnySQLiteColumn => researchTasks.id,
    ),
    type: text("type", { enum: TASK_TYPES }).notNull(),
    status: text("status", { enum: TASK_STATUSES }).notNull().default("planned"),
    priority: text("priority", { enum: TASK_PRIORITIES }).notNull().default("normal"),
    title: text("title").notNull(),
    workerPrompt: text("worker_prompt").notNull(),
    verificationPrompt: text("verification_prompt").notNull(),
    resultSummary: text("result_summary"),
    targetKind: text("target_kind"),
    targetId: text("target_id"),
    createdByAgentId: text("created_by_agent_id"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    ...payloadJson(),
    ...syncTracking(),
    ...timestamps(),
  },
  (table) => ({
    projectStatusIdx: index("research_tasks_project_status_idx").on(
      table.researchProjectId,
      table.status,
      table.createdAt,
    ),
  }),
);

export const researchTaskVerifications = sqliteTable(
  "research_task_verifications",
  {
    id: text("id").primaryKey(),
    researchTaskId: text("research_task_id")
      .notNull()
      .references(() => researchTasks.id),
    profile: text("profile", { enum: VERIFICATION_PROFILES }).notNull().default("general"),
    status: text("status", { enum: VERIFICATION_STATUSES }).notNull(),
    verifierPrompt: text("verifier_prompt").notNull(),
    judgment: text("judgment").notNull(),
    evidenceSummary: text("evidence_summary").notNull().default(""),
    createdByAgentId: text("created_by_agent_id"),
    ...payloadJson(),
    ...syncTracking(),
    ...timestamps(),
  },
  (table) => ({
    taskCreatedIdx: index("research_task_verifications_task_idx").on(
      table.researchTaskId,
      table.createdAt,
    ),
  }),
);

/**
 * SQL fragment for the runtime migrator. The app's `data/db/migrate.ts`
 * interpolates this. Order matters: research_projects before its
 * dependents (research_tasks, research_project_interactions),
 * research_tasks before research_task_verifications. External FKs to
 * `claude_agents` are preserved at the SQL level.
 */
export const RESEARCH_PROJECTS_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS research_projects (
  id TEXT PRIMARY KEY,
  goal TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'onboarding'
    CHECK (phase IN ('onboarding', 'baseline', 'search', 'reporting', 'complete')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'blocked_on_user', 'complete', 'failed', 'canceled')),
  baseline_summary TEXT,
  result_summary TEXT,
  created_by_agent_id TEXT REFERENCES claude_agents(id),
  started_at TEXT,
  completed_at TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_project_interactions (
  id TEXT PRIMARY KEY,
  research_project_id TEXT NOT NULL REFERENCES research_projects(id),
  kind TEXT NOT NULL CHECK (kind IN ('question', 'baseline_confirmation')),
  prompt TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'answered', 'confirmed', 'rejected', 'canceled')),
  response TEXT,
  created_by_agent_id TEXT REFERENCES claude_agents(id),
  resolved_at TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_tasks (
  id TEXT PRIMARY KEY,
  research_project_id TEXT NOT NULL REFERENCES research_projects(id),
  parent_research_task_id TEXT REFERENCES research_tasks(id),
  type TEXT NOT NULL CHECK (type IN ('explore', 'exploit', 'debug', 'verify', 'synthesize', 'prune')),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (
      status IN (
        'planned', 'running', 'awaiting_verification', 'verified',
        'rejected', 'pruned', 'failed', 'canceled'
      )
    ),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  title TEXT NOT NULL,
  worker_prompt TEXT NOT NULL,
  verification_prompt TEXT NOT NULL,
  result_summary TEXT,
  target_kind TEXT,
  target_id TEXT,
  created_by_agent_id TEXT REFERENCES claude_agents(id),
  started_at TEXT,
  completed_at TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_task_verifications (
  id TEXT PRIMARY KEY,
  research_task_id TEXT NOT NULL REFERENCES research_tasks(id),
  profile TEXT NOT NULL DEFAULT 'general'
    CHECK (profile IN ('hypothesis', 'experiment', 'measurement', 'adversarial', 'report', 'general')),
  status TEXT NOT NULL
    CHECK (status IN ('passed', 'failed', 'suspicious', 'needs_more_evidence')),
  verifier_prompt TEXT NOT NULL,
  judgment TEXT NOT NULL,
  evidence_summary TEXT NOT NULL DEFAULT '',
  created_by_agent_id TEXT REFERENCES claude_agents(id),
  payload_json TEXT NOT NULL DEFAULT '{}',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS research_projects_status_created_idx
  ON research_projects(status, created_at);
CREATE INDEX IF NOT EXISTS research_project_interactions_status_idx
  ON research_project_interactions(status, created_at);
CREATE INDEX IF NOT EXISTS research_tasks_project_status_idx
  ON research_tasks(research_project_id, status, created_at);
CREATE INDEX IF NOT EXISTS research_task_verifications_task_idx
  ON research_task_verifications(research_task_id, created_at);
`;
