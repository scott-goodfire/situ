/**
 * Keep this file together intentionally.
 *
 * The Drizzle schema is a central cross-domain contract. The one-file shape
 * keeps table relationships and runtime-migration drift easy to audit; split it
 * only after a clear table-domain module shape would reduce cognitive load more
 * than the extra import churn adds.
 */
import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

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

function syncTracking() {
  return {
    syncVersion: integer("sync_version").notNull().default(1),
    syncDeleted: integer("sync_deleted", { mode: "boolean" }).notNull().default(false),
  };
}

export const syncState = sqliteTable("sync_state", {
  id: text("id").primaryKey(),
  version: integer("version").notNull().default(1),
  ...timestamps(),
});

export const replicacheClients = sqliteTable("replicache_clients", {
  id: text("id").primaryKey(),
  clientGroupId: text("client_group_id").notNull(),
  lastMutationId: integer("last_mutation_id").notNull().default(0),
  ...timestamps(),
});

export const localSettings = sqliteTable("local_settings", {
  id: text("id").primaryKey(),
  anthropicKeyConfigured: integer("anthropic_key_configured", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  ...syncTracking(),
  ...timestamps(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    objective: text("objective").notNull().default(""),
    repoPath: text("repo_path").notNull().default(""),
    workspaceKey: text("workspace_key").notNull().default(""),
    status: text("status", {
      enum: ["active", "closed", "failed", "canceled"],
    })
      .notNull()
      .default("active"),
    claudeSessionId: text("claude_session_id"),
    claudeEnvironmentId: text("claude_environment_id"),
    claudeMemoryStoreId: text("claude_memory_store_id"),
    closedAt: text("closed_at"),
    ...syncTracking(),
    ...timestamps(),
  },
  (table) => ({
    claudeSessionIdIdx: uniqueIndex("session_claude_session_id_idx").on(table.claudeSessionId),
  }),
);

export const claudeAgents = sqliteTable(
  "claude_agents",
  {
    id: text("id").primaryKey(),
    kind: text("kind", {
      enum: ["manager", "scientist", "verifier", "scribe", "reporter"],
    }).notNull(),
    displayName: text("display_name").notNull(),
    claudeAgentId: text("claude_agent_id"),
    claudeAgentVersion: integer("claude_agent_version"),
    claudeSessionId: text("claude_session_id"),
    model: text("model"),
    status: text("status", {
      enum: ["idle", "active", "closed"],
    })
      .notNull()
      .default("idle"),
    ...syncTracking(),
    ...timestamps(),
  },
  (table) => ({
    claudeAgentIdIdx: uniqueIndex("claude_agents_claude_agent_id_idx").on(table.claudeAgentId),
  }),
);

export const claudeAgentEnvironments = sqliteTable(
  "claude_agent_environments",
  {
    id: text("id").primaryKey(),
    claudeEnvironmentId: text("claude_environment_id").notNull(),
    name: text("name").notNull(),
    ...syncTracking(),
    ...timestamps(),
  },
  (table) => ({
    claudeEnvironmentIdIdx: uniqueIndex("claude_agent_environments_claude_environment_id_idx").on(
      table.claudeEnvironmentId,
    ),
  }),
);

export const researchProjects = sqliteTable(
  "research_projects",
  {
    id: text("id").primaryKey(),
    goal: text("goal").notNull(),
    phase: text("phase", {
      enum: ["onboarding", "baseline", "search", "reporting", "complete"],
    })
      .notNull()
      .default("onboarding"),
    status: text("status", {
      enum: ["active", "blocked_on_user", "complete", "failed", "canceled"],
    })
      .notNull()
      .default("active"),
    baselineSummary: text("baseline_summary"),
    resultSummary: text("result_summary"),
    createdByAgentId: text("created_by_agent_id").references(() => claudeAgents.id),
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
    kind: text("kind", {
      enum: ["question", "baseline_confirmation"],
    }).notNull(),
    prompt: text("prompt").notNull(),
    details: text("details").notNull().default(""),
    status: text("status", {
      enum: ["pending", "answered", "confirmed", "rejected", "canceled"],
    })
      .notNull()
      .default("pending"),
    response: text("response"),
    createdByAgentId: text("created_by_agent_id").references(() => claudeAgents.id),
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

export const feedEntries = sqliteTable(
  "feed_entries",
  {
    id: text("id").primaryKey(),
    researchProjectId: text("research_project_id")
      .notNull()
      .references(() => researchProjects.id),
    summaryMarkdown: text("summary_markdown").notNull(),
    severity: text("severity", {
      enum: ["info", "progress", "stuck", "failure"],
    }).notNull(),
    citedAppEventIdsJson: text("cited_app_event_ids_json").notNull().default("[]"),
    windowStartedAt: text("window_started_at").notNull(),
    windowEndedAt: text("window_ended_at").notNull(),
    createdByAgentId: text("created_by_agent_id").references(() => claudeAgents.id),
    ...syncTracking(),
    ...timestamps(),
  },
  (table) => ({
    projectCreatedIdx: index("feed_entries_project_created_idx").on(
      table.researchProjectId,
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
    type: text("type", {
      enum: ["explore", "exploit", "debug", "verify", "synthesize", "prune"],
    }).notNull(),
    status: text("status", {
      enum: [
        "planned",
        "running",
        "awaiting_verification",
        "verified",
        "rejected",
        "pruned",
        "failed",
        "canceled",
      ],
    })
      .notNull()
      .default("planned"),
    priority: text("priority", {
      enum: ["urgent", "high", "normal", "low"],
    })
      .notNull()
      .default("normal"),
    title: text("title").notNull(),
    workerPrompt: text("worker_prompt").notNull(),
    verificationPrompt: text("verification_prompt").notNull(),
    resultSummary: text("result_summary"),
    targetKind: text("target_kind"),
    targetId: text("target_id"),
    createdByAgentId: text("created_by_agent_id").references(() => claudeAgents.id),
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
    profile: text("profile", {
      enum: ["hypothesis", "experiment", "measurement", "adversarial", "report", "general"],
    })
      .notNull()
      .default("general"),
    status: text("status", {
      enum: ["passed", "failed", "suspicious", "needs_more_evidence"],
    }).notNull(),
    verifierPrompt: text("verifier_prompt").notNull(),
    judgment: text("judgment").notNull(),
    evidenceSummary: text("evidence_summary").notNull().default(""),
    createdByAgentId: text("created_by_agent_id").references(() => claudeAgents.id),
    ...payloadJson(),
    ...syncTracking(),
    ...timestamps(),
  },
  (table) => ({
    taskIdx: index("research_task_verifications_task_idx").on(
      table.researchTaskId,
      table.createdAt,
    ),
  }),
);

// The work_items table lives in @situ/work-items; re-exported here so the
// drizzle client's schema includes it and existing import paths still work.
import { workItems } from "@situ/work-items";
export { workItems };

export const claudeAgentRuns = sqliteTable(
  "claude_agent_runs",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id").references(() => claudeAgents.id),
    workItemId: text("work_item_id").references(() => workItems.id),
    claudeSessionId: text("claude_session_id"),
    status: text("status", {
      enum: ["queued", "running", "waiting_for_action", "complete", "failed", "canceled"],
    })
      .notNull()
      .default("queued"),
    attempt: integer("attempt").notNull().default(0),
    lastEventId: text("last_event_id"),
    lastEventAt: text("last_event_at"),
    leaseExpiresAt: text("lease_expires_at"),
    errorMessage: text("error_message"),
    ...payloadJson(),
    ...syncTracking(),
    ...timestamps(),
  },
  (table) => ({
    statusIdx: index("claude_agent_runs_status_idx").on(table.status, table.updatedAt),
    workItemIdx: uniqueIndex("claude_agent_runs_work_item_idx").on(table.workItemId),
  }),
);

// Research-record tables live in @situ/research-records; re-exported here so
// the drizzle client's schema includes them and existing import paths keep
// working.
import {
  artifacts,
  baselines,
  entityLinks,
  evaluations,
  experiments,
  hypotheses,
  measurements,
} from "@situ/research-records";
export { artifacts, baselines, entityLinks, evaluations, experiments, hypotheses, measurements };

export const appEvents = sqliteTable(
  "app_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    ...payloadJson(),
    ...syncTracking(),
    ...createdAtOnly(),
  },
  (table) => ({
    createdIdx: index("app_events_created_idx").on(table.createdAt),
  }),
);

// Activity tables for the research records also live in @situ/research-records.
export {
  baselineActivities,
  evaluationActivities,
  experimentActivities,
  hypothesisActivities,
} from "@situ/research-records";

// The compute_targets table lives in @situ/compute; re-exported here so the
// drizzle client's schema includes it and existing import paths still work.
export { computeTargets } from "@situ/compute";

export const claudeAgentEvents = sqliteTable(
  "claude_agent_events",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id").references(() => claudeAgents.id),
    claudeEventId: text("claude_event_id"),
    type: text("type").notNull(),
    payloadJson: text("payload_json").notNull(),
    ...syncTracking(),
    ...createdAtOnly(),
  },
  (table) => ({
    createdIdx: index("claude_agent_events_created_idx").on(table.createdAt),
  }),
);

export type Session = typeof session.$inferSelect;
export type ClaudeAgent = typeof claudeAgents.$inferSelect;
export type ClaudeAgentRun = typeof claudeAgentRuns.$inferSelect;
export type ResearchProject = typeof researchProjects.$inferSelect;
export type ResearchProjectInteraction = typeof researchProjectInteractions.$inferSelect;
export type ResearchTask = typeof researchTasks.$inferSelect;
export type ResearchTaskVerification = typeof researchTaskVerifications.$inferSelect;
export type WorkItem = typeof workItems.$inferSelect;
