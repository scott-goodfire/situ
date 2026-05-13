import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export type InstallSchemaInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

/**
 * Installs the local SQLite tables.
 */
export const installSchema = ({ db }: InstallSchemaInput): void => {
  db.run("PRAGMA foreign_keys = ON");

  db.run(`
    CREATE TABLE IF NOT EXISTS replicache_clients (
      client_id TEXT PRIMARY KEY,
      last_mutation_id INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS replicache_mutations (
      client_id TEXT NOT NULL,
      mutation_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (client_id, mutation_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sync_state (
      id TEXT PRIMARY KEY,
      last_version INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      goal_markdown TEXT NOT NULL,
      status TEXT NOT NULL,
      current_baseline_summary TEXT NOT NULL,
      current_answer_summary TEXT NOT NULL,
      confidence_summary TEXT NOT NULL,
      blockers_summary TEXT NOT NULL,
      open_questions_summary TEXT NOT NULL,
      progress_checkpoints_summary TEXT NOT NULL,
      final_result_summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      instructions_markdown TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS agents_status_idx ON agents (status)");

  db.run(`
    CREATE TABLE IF NOT EXISTS agent_sessions (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      parent_agent_session_id TEXT,
      remote_claude_agent_id TEXT,
      remote_claude_session_id TEXT,
      remote_claude_thread_id TEXT,
      context_target_kind TEXT,
      context_target_id TEXT,
      current_notification_id TEXT,
      status TEXT NOT NULL,
      last_activity_at TEXT NOT NULL,
      remote_event_cursor TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS agent_sessions_agent_idx ON agent_sessions (agent_id)");
  db.run("CREATE INDEX IF NOT EXISTS agent_sessions_status_idx ON agent_sessions (status)");

  db.run(`
    CREATE TABLE IF NOT EXISTS agent_session_logs (
      id TEXT PRIMARY KEY,
      agent_session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      remote_id TEXT,
      summary TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS agent_session_logs_session_idx
    ON agent_session_logs (agent_session_id)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS labels_archived_idx ON labels (archived_at)");

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body_markdown TEXT NOT NULL,
      status TEXT NOT NULL,
      type TEXT NOT NULL,
      priority INTEGER NOT NULL,
      creator_actor_kind TEXT NOT NULL,
      creator_actor_id TEXT NOT NULL,
      assignee_actor_kind TEXT,
      assignee_actor_id TEXT,
      active_agent_session_id TEXT,
      parent_task_id TEXT,
      target_kind TEXT,
      target_id TEXT,
      label_ids_json TEXT NOT NULL,
      last_activity_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks (project_id)");
  db.run("CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON tasks (assignee_actor_id)");
  db.run("CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status)");

  db.run(`
    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      project_id TEXT NOT NULL,
      task_id TEXT,
      parent_experiment_id TEXT,
      title TEXT NOT NULL,
      summary_markdown TEXT NOT NULL,
      worktree_path TEXT NOT NULL,
      base_commit TEXT NOT NULL,
      current_candidate_commit TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS experiments_project_idx ON experiments (project_id)");
  db.run("CREATE INDEX IF NOT EXISTS experiments_task_idx ON experiments (task_id)");
  db.run("CREATE INDEX IF NOT EXISTS experiments_status_idx ON experiments (status)");

  db.run(`
    CREATE TABLE IF NOT EXISTS measurements (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      project_id TEXT NOT NULL,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      name TEXT NOT NULL,
      value_json TEXT NOT NULL,
      unit TEXT,
      summary_markdown TEXT NOT NULL,
      observed_commit TEXT,
      measured_by_actor_kind TEXT NOT NULL,
      measured_by_actor_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS measurements_project_idx ON measurements (project_id)");
  db.run(`
    CREATE INDEX IF NOT EXISTS measurements_target_idx
    ON measurements (target_kind, target_id)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      project_id TEXT NOT NULL,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      uri TEXT NOT NULL,
      media_type TEXT,
      summary_markdown TEXT NOT NULL,
      task_id TEXT,
      experiment_id TEXT,
      source_commit TEXT,
      created_by_actor_kind TEXT NOT NULL,
      created_by_actor_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS artifacts_project_idx ON artifacts (project_id)");
  db.run("CREATE INDEX IF NOT EXISTS artifacts_experiment_idx ON artifacts (experiment_id)");
  db.run("CREATE INDEX IF NOT EXISTS artifacts_task_idx ON artifacts (task_id)");

  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      project_id TEXT NOT NULL,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reviewer_actor_kind TEXT NOT NULL,
      reviewer_actor_id TEXT NOT NULL,
      status TEXT NOT NULL,
      rationale_markdown TEXT NOT NULL,
      reviewed_commit TEXT,
      cited_measurement_ids_json TEXT NOT NULL,
      cited_artifact_ids_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS reviews_project_idx ON reviews (project_id)");
  db.run("CREATE INDEX IF NOT EXISTS reviews_target_idx ON reviews (target_kind, target_id)");

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      author_actor_kind TEXT NOT NULL,
      author_actor_id TEXT NOT NULL,
      body_markdown TEXT NOT NULL,
      cited_targets_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS comments_target_idx ON comments (target_kind, target_id)");

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      recipient_actor_kind TEXT NOT NULL,
      recipient_actor_id TEXT NOT NULL,
      type TEXT NOT NULL,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body_markdown TEXT,
      read_at TEXT,
      dismissed_at TEXT,
      snoozed_until TEXT,
      delivery_attempted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS notifications_recipient_idx
    ON notifications (recipient_actor_id, read_at, dismissed_at, snoozed_until)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS notifications_target_idx
    ON notifications (recipient_actor_id, type, target_kind, target_id)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      sync_version INTEGER NOT NULL,
      sync_deleted INTEGER NOT NULL,
      type TEXT NOT NULL,
      actor_kind TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      message TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS events_target_idx ON events (target_kind, target_id)");
};
