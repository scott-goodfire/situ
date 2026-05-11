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

export const workItems = sqliteTable(
  "work_items",
  {
    id: text("id").primaryKey(),
    purpose: text("purpose").notNull(),
    targetKind: text("target_kind").notNull(),
    targetId: text("target_id").notNull(),
    status: text("status", {
      enum: ["pending", "claimed", "done", "failed", "canceled"],
    })
      .notNull()
      .default("pending"),
    ownerAgentId: text("owner_agent_id").references(() => claudeAgents.id),
    ownerWorkflowId: text("owner_workflow_id"),
    attempt: integer("attempt").notNull().default(0),
    availableAt: text("available_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    claimedAt: text("claimed_at"),
    leaseExpiresAt: text("lease_expires_at"),
    completedAt: text("completed_at"),
    ...payloadJson(),
    ...syncTracking(),
    ...timestamps(),
  },
  (table) => ({
    statusAvailableIdx: index("work_items_status_available_idx").on(
      table.status,
      table.availableAt,
    ),
    leaseIdx: index("work_items_lease_idx").on(table.status, table.leaseExpiresAt),
    openTargetIdx: uniqueIndex("work_items_open_target_unique")
      .on(table.purpose, table.targetKind, table.targetId)
      .where(sql`${table.status} IN ('pending', 'claimed')`),
  }),
);

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

export const hypotheses = sqliteTable("hypotheses", {
  id: text("id").primaryKey(),
  createdByResearchTaskId: text("created_by_research_task_id").references(() => researchTasks.id),
  createdByAgentId: text("created_by_agent_id").references(() => claudeAgents.id),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status", {
    enum: ["triage", "accepted", "active", "in_review", "done", "canceled", "failed"],
  })
    .notNull()
    .default("triage"),
  ...syncTracking(),
  ...timestamps(),
});

export const experiments = sqliteTable("experiments", {
  id: text("id").primaryKey(),
  createdByResearchTaskId: text("created_by_research_task_id").references(() => researchTasks.id),
  createdByAgentId: text("created_by_agent_id").references(() => claudeAgents.id),
  associatedHypothesisId: text("associated_hypothesis_id")
    .notNull()
    .references(() => hypotheses.id),
  parentExperimentId: text("parent_experiment_id").references(
    (): AnySQLiteColumn => experiments.id,
  ),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status", {
    enum: ["triage", "accepted", "active", "in_review", "done", "canceled", "failed"],
  })
    .notNull()
    .default("triage"),
  worktreePath: text("worktree_path"),
  baseCommit: text("base_commit"),
  candidateCommit: text("candidate_commit"),
  ...syncTracking(),
  ...timestamps(),
});

export const baselines = sqliteTable("baselines", {
  id: text("id").primaryKey(),
  researchProjectId: text("research_project_id")
    .notNull()
    .references(() => researchProjects.id),
  createdByResearchTaskId: text("created_by_research_task_id").references(() => researchTasks.id),
  createdByAgentId: text("created_by_agent_id").references(() => claudeAgents.id),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status", {
    enum: ["triage", "accepted", "active", "in_review", "done", "canceled", "failed"],
  })
    .notNull()
    .default("triage"),
  ...payloadJson(),
  ...syncTracking(),
  ...timestamps(),
});

export const evaluations = sqliteTable("evaluations", {
  id: text("id").primaryKey(),
  createdByResearchTaskId: text("created_by_research_task_id").references(() => researchTasks.id),
  createdByAgentId: text("created_by_agent_id").references(() => claudeAgents.id),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status", {
    enum: ["triage", "accepted", "active", "in_review", "done", "canceled", "failed"],
  })
    .notNull()
    .default("triage"),
  associatedBaselineId: text("associated_baseline_id").references(() => baselines.id),
  associatedExperimentId: text("associated_experiment_id").references(() => experiments.id),
  ...syncTracking(),
  ...timestamps(),
});

export const measurements = sqliteTable("measurements", {
  id: text("id").primaryKey(),
  createdByResearchTaskId: text("created_by_research_task_id").references(() => researchTasks.id),
  createdByAgentId: text("created_by_agent_id").references(() => claudeAgents.id),
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
  createdByResearchTaskId: text("created_by_research_task_id").references(() => researchTasks.id),
  createdByAgentId: text("created_by_agent_id").references(() => claudeAgents.id),
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

export const hypothesisActivities = sqliteTable("hypothesis_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  hypothesisId: text("hypothesis_id")
    .notNull()
    .references(() => hypotheses.id),
  actorAgentId: text("actor_agent_id").references(() => claudeAgents.id),
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
  actorAgentId: text("actor_agent_id").references(() => claudeAgents.id),
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
  actorAgentId: text("actor_agent_id").references(() => claudeAgents.id),
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
  actorAgentId: text("actor_agent_id").references(() => claudeAgents.id),
  actor: text("actor").notNull(),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  ...payloadJson(),
  ...syncTracking(),
  ...createdAtOnly(),
});

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
