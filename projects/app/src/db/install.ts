import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export type InstallSchemaInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

/** Installs the local SQLite tables used by the app database. */
export const installSchema = ({ db }: InstallSchemaInput): void => {
  db.run("PRAGMA foreign_keys = ON");

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
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
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
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
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
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
      created_at TEXT NOT NULL
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
