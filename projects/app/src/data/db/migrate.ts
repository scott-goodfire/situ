/**
 * Keep this file together intentionally.
 *
 * The runtime migrator is the compact current-schema bootstrap. The one-file
 * shape keeps boot SQL easy to audit against db/schema.ts; split it only after
 * a clear table-domain module shape would reduce cognitive load more than the
 * extra import churn adds.
 */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";
import { ensureRuntimeContext, migrationSessionId } from "../../config/session-context";
import { sqlitePath } from "../../config/paths";

export function migrate(): void {
  const path = sqlitePath();
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  sqlite.exec(SCHEMA_SQL);
  sqlite.close();
}

const SYNC_COLUMNS = `
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_deleted INTEGER NOT NULL DEFAULT 0
`;

const TIMESTAMPS = `
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
`;

const CREATED_AT = "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP";
const PAYLOAD_JSON = "payload_json TEXT NOT NULL DEFAULT '{}'";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sync_state (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  ${TIMESTAMPS}
);

INSERT OR IGNORE INTO sync_state (id, version) VALUES ('global', 1);

CREATE TABLE IF NOT EXISTS replicache_clients (
  id TEXT PRIMARY KEY,
  client_group_id TEXT NOT NULL,
  last_mutation_id INTEGER NOT NULL DEFAULT 0,
  ${TIMESTAMPS}
);

CREATE TABLE IF NOT EXISTS local_settings (
  id TEXT PRIMARY KEY,
  anthropic_key_configured INTEGER NOT NULL DEFAULT 0,
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT '',
  repo_path TEXT NOT NULL DEFAULT '',
  workspace_key TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'failed', 'canceled')),
  claude_session_id TEXT UNIQUE,
  claude_environment_id TEXT,
  closed_at TEXT,
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
);

CREATE TABLE IF NOT EXISTS claude_agents (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('manager', 'scientist', 'verifier')),
  display_name TEXT NOT NULL,
  claude_agent_id TEXT UNIQUE,
  claude_agent_version INTEGER,
  claude_session_id TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'closed')),
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
);

CREATE TABLE IF NOT EXISTS claude_agent_environments (
  id TEXT PRIMARY KEY,
  claude_environment_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
);

CREATE TABLE IF NOT EXISTS research_projects (
  id TEXT PRIMARY KEY,
  goal TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'onboarding'
    CHECK (phase IN ('onboarding', 'search', 'reporting', 'complete')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'blocked_on_user', 'complete', 'failed', 'canceled')),
  baseline_summary TEXT,
  result_summary TEXT,
  created_by_agent_id TEXT REFERENCES claude_agents(id),
  started_at TEXT,
  completed_at TEXT,
  ${PAYLOAD_JSON},
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
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
  ${PAYLOAD_JSON},
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
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
  ${PAYLOAD_JSON},
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
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
  ${PAYLOAD_JSON},
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
);

CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  target_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'done', 'failed', 'canceled')),
  owner_agent_id TEXT REFERENCES claude_agents(id),
  owner_workflow_id TEXT,
  attempt INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claimed_at TEXT,
  lease_expires_at TEXT,
  completed_at TEXT,
  ${PAYLOAD_JSON},
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
);

CREATE TABLE IF NOT EXISTS claude_agent_runs (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES claude_agents(id),
  work_item_id TEXT UNIQUE REFERENCES work_items(id),
  claude_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (
      status IN (
        'queued', 'running', 'waiting_for_action',
        'complete', 'failed', 'canceled'
      )
    ),
  attempt INTEGER NOT NULL DEFAULT 0,
  last_event_id TEXT,
  last_event_at TEXT,
  lease_expires_at TEXT,
  error_message TEXT,
  ${PAYLOAD_JSON},
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
);

CREATE TABLE IF NOT EXISTS hypotheses (
  id TEXT PRIMARY KEY,
  created_by_research_task_id TEXT REFERENCES research_tasks(id),
  created_by_agent_id TEXT REFERENCES claude_agents(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'triage'
    CHECK (status IN ('triage', 'accepted', 'active', 'in_review', 'done', 'canceled', 'failed')),
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
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
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
);

CREATE TABLE IF NOT EXISTS baselines (
  id TEXT PRIMARY KEY,
  created_by_research_task_id TEXT REFERENCES research_tasks(id),
  created_by_agent_id TEXT REFERENCES claude_agents(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'triage'
    CHECK (status IN ('triage', 'accepted', 'active', 'in_review', 'done', 'canceled', 'failed')),
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
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
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
);

CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  created_by_research_task_id TEXT REFERENCES research_tasks(id),
  created_by_agent_id TEXT REFERENCES claude_agents(id),
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
  actor TEXT NOT NULL,
  body TEXT NOT NULL,
  ${PAYLOAD_JSON},
  ${SYNC_COLUMNS},
  ${CREATED_AT}
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
  ${SYNC_COLUMNS},
  ${CREATED_AT}
);

CREATE TABLE IF NOT EXISTS entity_links (
  id TEXT PRIMARY KEY,
  from_kind TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_kind TEXT NOT NULL,
  to_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  ${SYNC_COLUMNS},
  ${CREATED_AT}
);

CREATE TABLE IF NOT EXISTS app_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  ${PAYLOAD_JSON},
  ${SYNC_COLUMNS},
  ${CREATED_AT}
);

CREATE TABLE IF NOT EXISTS hypothesis_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hypothesis_id TEXT NOT NULL REFERENCES hypotheses(id),
  actor_agent_id TEXT REFERENCES claude_agents(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  ${PAYLOAD_JSON},
  ${SYNC_COLUMNS},
  ${CREATED_AT}
);

CREATE TABLE IF NOT EXISTS experiment_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experiment_id TEXT NOT NULL REFERENCES experiments(id),
  actor_agent_id TEXT REFERENCES claude_agents(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  ${PAYLOAD_JSON},
  ${SYNC_COLUMNS},
  ${CREATED_AT}
);

CREATE TABLE IF NOT EXISTS baseline_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  baseline_id TEXT NOT NULL REFERENCES baselines(id),
  actor_agent_id TEXT REFERENCES claude_agents(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  ${PAYLOAD_JSON},
  ${SYNC_COLUMNS},
  ${CREATED_AT}
);

CREATE TABLE IF NOT EXISTS evaluation_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
  actor_agent_id TEXT REFERENCES claude_agents(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  ${PAYLOAD_JSON},
  ${SYNC_COLUMNS},
  ${CREATED_AT}
);

CREATE TABLE IF NOT EXISTS compute_targets (
  id TEXT PRIMARY KEY,
  pool TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'local',
  label TEXT,
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'claimed', 'draining', 'dead')),
  claimed_by_research_task_id TEXT REFERENCES research_tasks(id),
  claimed_at TEXT,
  lease_expires_at TEXT,
  last_heartbeat TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  ${SYNC_COLUMNS},
  ${TIMESTAMPS}
);

CREATE TABLE IF NOT EXISTS claude_agent_events (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES claude_agents(id),
  claude_event_id TEXT,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  ${SYNC_COLUMNS},
  ${CREATED_AT}
);

CREATE INDEX IF NOT EXISTS work_items_status_available_idx
  ON work_items(status, available_at);
CREATE INDEX IF NOT EXISTS work_items_lease_idx
  ON work_items(status, lease_expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS work_items_open_target_unique
  ON work_items(purpose, target_kind, target_id)
  WHERE status IN ('pending', 'claimed');
CREATE INDEX IF NOT EXISTS claude_agent_runs_status_idx
  ON claude_agent_runs(status, updated_at);
CREATE INDEX IF NOT EXISTS app_events_created_idx
  ON app_events(created_at);
CREATE INDEX IF NOT EXISTS claude_agent_events_created_idx
  ON claude_agent_events(created_at);
CREATE INDEX IF NOT EXISTS compute_targets_pool_status_idx
  ON compute_targets(pool, status);
CREATE INDEX IF NOT EXISTS research_projects_status_created_idx
  ON research_projects(status, created_at);
CREATE INDEX IF NOT EXISTS research_project_interactions_status_idx
  ON research_project_interactions(status, created_at);
CREATE INDEX IF NOT EXISTS research_tasks_project_status_idx
  ON research_tasks(research_project_id, status, created_at);
CREATE INDEX IF NOT EXISTS research_task_verifications_task_idx
  ON research_task_verifications(research_task_id, created_at);
`;

if (import.meta.main) {
  await ensureRuntimeContext({ sessionId: migrationSessionId() });
  migrate();
  console.log(`Migrated ${sqlitePath()}`);
}
