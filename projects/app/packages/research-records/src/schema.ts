import { sql } from "drizzle-orm";
import { type AnySQLiteColumn, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const RESEARCH_RECORD_STATUSES = [
  "triage",
  "accepted",
  "active",
  "in_review",
  "done",
  "canceled",
  "failed",
] as const;

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

function createdAtOnly() {
  return {
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  };
}

function payloadJson() {
  return {
    payloadJson: text("payload_json").notNull().default("{}"),
  };
}

export const hypotheses = sqliteTable("hypotheses", {
  id: text("id").primaryKey(),
  createdByResearchTaskId: text("created_by_research_task_id"),
  createdByAgentId: text("created_by_agent_id"),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status", { enum: RESEARCH_RECORD_STATUSES }).notNull().default("triage"),
  ...syncTracking(),
  ...timestamps(),
});

export const experiments = sqliteTable("experiments", {
  id: text("id").primaryKey(),
  createdByResearchTaskId: text("created_by_research_task_id"),
  createdByAgentId: text("created_by_agent_id"),
  associatedHypothesisId: text("associated_hypothesis_id")
    .notNull()
    .references(() => hypotheses.id),
  parentExperimentId: text("parent_experiment_id").references(
    (): AnySQLiteColumn => experiments.id,
  ),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status", { enum: RESEARCH_RECORD_STATUSES }).notNull().default("triage"),
  worktreePath: text("worktree_path"),
  baseCommit: text("base_commit"),
  candidateCommit: text("candidate_commit"),
  ...syncTracking(),
  ...timestamps(),
});

export const baselines = sqliteTable("baselines", {
  id: text("id").primaryKey(),
  researchProjectId: text("research_project_id").notNull(),
  createdByResearchTaskId: text("created_by_research_task_id"),
  createdByAgentId: text("created_by_agent_id"),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status", { enum: RESEARCH_RECORD_STATUSES }).notNull().default("triage"),
  ...payloadJson(),
  ...syncTracking(),
  ...timestamps(),
});

export const evaluations = sqliteTable("evaluations", {
  id: text("id").primaryKey(),
  createdByResearchTaskId: text("created_by_research_task_id"),
  createdByAgentId: text("created_by_agent_id"),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status", { enum: RESEARCH_RECORD_STATUSES }).notNull().default("triage"),
  associatedBaselineId: text("associated_baseline_id").references(() => baselines.id),
  associatedExperimentId: text("associated_experiment_id").references(() => experiments.id),
  ...syncTracking(),
  ...timestamps(),
});

export const measurements = sqliteTable("measurements", {
  id: text("id").primaryKey(),
  createdByResearchTaskId: text("created_by_research_task_id"),
  createdByAgentId: text("created_by_agent_id"),
  evaluationId: text("evaluation_id")
    .notNull()
    .references(() => evaluations.id),
  actor: text("actor").notNull(),
  body: text("body").notNull(),
  ...payloadJson(),
  ...syncTracking(),
  ...createdAtOnly(),
});

export const artifacts = sqliteTable("artifacts", {
  id: text("id").primaryKey(),
  createdByResearchTaskId: text("created_by_research_task_id"),
  createdByAgentId: text("created_by_agent_id"),
  entityKind: text("entity_kind").notNull(),
  entityId: text("entity_id").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  path: text("path").notNull(),
  mediaType: text("media_type"),
  sizeBytes: integer("size_bytes"),
  ...syncTracking(),
  ...createdAtOnly(),
});

export const entityLinks = sqliteTable("entity_links", {
  id: text("id").primaryKey(),
  fromKind: text("from_kind").notNull(),
  fromId: text("from_id").notNull(),
  toKind: text("to_kind").notNull(),
  toId: text("to_id").notNull(),
  relationship: text("relationship").notNull(),
  ...syncTracking(),
  ...createdAtOnly(),
});

export const hypothesisActivities = sqliteTable("hypothesis_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  hypothesisId: text("hypothesis_id")
    .notNull()
    .references(() => hypotheses.id),
  actorAgentId: text("actor_agent_id"),
  actor: text("actor").notNull(),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  ...payloadJson(),
  ...syncTracking(),
  ...createdAtOnly(),
});

export const experimentActivities = sqliteTable("experiment_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  experimentId: text("experiment_id")
    .notNull()
    .references(() => experiments.id),
  actorAgentId: text("actor_agent_id"),
  actor: text("actor").notNull(),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  ...payloadJson(),
  ...syncTracking(),
  ...createdAtOnly(),
});

export const baselineActivities = sqliteTable("baseline_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  baselineId: text("baseline_id")
    .notNull()
    .references(() => baselines.id),
  actorAgentId: text("actor_agent_id"),
  actor: text("actor").notNull(),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  ...payloadJson(),
  ...syncTracking(),
  ...createdAtOnly(),
});

export const evaluationActivities = sqliteTable("evaluation_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  evaluationId: text("evaluation_id")
    .notNull()
    .references(() => evaluations.id),
  actorAgentId: text("actor_agent_id"),
  actor: text("actor").notNull(),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  ...payloadJson(),
  ...syncTracking(),
  ...createdAtOnly(),
});

/**
 * SQL fragment for the runtime migrator. The app's `data/db/migrate.ts`
 * interpolates this into the full schema string. Order matters: hypotheses
 * before experiments (FK), baselines/experiments before evaluations,
 * evaluations before measurements, and each *_activities table after its
 * parent. External FKs to `research_tasks`, `claude_agents`, and
 * `research_projects` are preserved at the SQL level.
 */
export const RESEARCH_RECORDS_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS hypotheses (
  id TEXT PRIMARY KEY,
  created_by_research_task_id TEXT REFERENCES research_tasks(id),
  created_by_agent_id TEXT REFERENCES claude_agents(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'triage'
    CHECK (status IN ('triage', 'accepted', 'active', 'in_review', 'done', 'canceled', 'failed')),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  created_by_research_task_id TEXT REFERENCES research_tasks(id),
  created_by_agent_id TEXT REFERENCES claude_agents(id),
  associated_hypothesis_id TEXT NOT NULL REFERENCES hypotheses(id),
  parent_experiment_id TEXT REFERENCES experiments(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'triage'
    CHECK (status IN ('triage', 'accepted', 'active', 'in_review', 'done', 'canceled', 'failed')),
  worktree_path TEXT,
  base_commit TEXT,
  candidate_commit TEXT,
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS baselines (
  id TEXT PRIMARY KEY,
  research_project_id TEXT NOT NULL REFERENCES research_projects(id),
  created_by_research_task_id TEXT REFERENCES research_tasks(id),
  created_by_agent_id TEXT REFERENCES claude_agents(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'triage'
    CHECK (status IN ('triage', 'accepted', 'active', 'in_review', 'done', 'canceled', 'failed')),
  payload_json TEXT NOT NULL DEFAULT '{}',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  created_by_research_task_id TEXT REFERENCES research_tasks(id),
  created_by_agent_id TEXT REFERENCES claude_agents(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'triage'
    CHECK (status IN ('triage', 'accepted', 'active', 'in_review', 'done', 'canceled', 'failed')),
  associated_baseline_id TEXT REFERENCES baselines(id),
  associated_experiment_id TEXT REFERENCES experiments(id),
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  created_by_research_task_id TEXT REFERENCES research_tasks(id),
  created_by_agent_id TEXT REFERENCES claude_agents(id),
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
  actor TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  created_by_research_task_id TEXT REFERENCES research_tasks(id),
  created_by_agent_id TEXT REFERENCES claude_agents(id),
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  path TEXT NOT NULL,
  media_type TEXT,
  size_bytes INTEGER,
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entity_links (
  id TEXT PRIMARY KEY,
  from_kind TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_kind TEXT NOT NULL,
  to_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hypothesis_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hypothesis_id TEXT NOT NULL REFERENCES hypotheses(id),
  actor_agent_id TEXT REFERENCES claude_agents(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS experiment_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experiment_id TEXT NOT NULL REFERENCES experiments(id),
  actor_agent_id TEXT REFERENCES claude_agents(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS baseline_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  baseline_id TEXT NOT NULL REFERENCES baselines(id),
  actor_agent_id TEXT REFERENCES claude_agents(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluation_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
  actor_agent_id TEXT REFERENCES claude_agents(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
