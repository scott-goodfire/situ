from __future__ import annotations

import sqlite3

from .serialization import utc_now


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  repo_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  research_context TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  project_id TEXT REFERENCES projects(id),
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hypotheses (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS baselines (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  associated_baseline_id TEXT REFERENCES baselines(id),
  associated_experiment_id TEXT REFERENCES experiments(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  created_by_agent_id TEXT REFERENCES agents(id),
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  supersedes_analysis_id TEXT REFERENCES analyses(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hypothesis_experiment_links (
  hypothesis_id TEXT NOT NULL REFERENCES hypotheses(id),
  experiment_id TEXT NOT NULL REFERENCES experiments(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (hypothesis_id, experiment_id)
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  kind TEXT NOT NULL,
  display_name TEXT NOT NULL,
  model_name TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  assignee_id TEXT REFERENCES agents(id),
  parent_task_id TEXT REFERENCES tasks(id),
  payload_json TEXT NOT NULL,
  pydantic_run_id TEXT,
  conversation_id TEXT,
  result_summary TEXT,
  created_at TEXT NOT NULL,
  available_at TEXT NOT NULL,
  claimed_in_session_id TEXT REFERENCES sessions(id),
  claimed_at TEXT,
  completed_in_session_id TEXT REFERENCES sessions(id),
  completed_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_dependencies (
  project_id TEXT NOT NULL REFERENCES projects(id),
  task_id TEXT NOT NULL REFERENCES tasks(id),
  blocked_by_task_id TEXT NOT NULL REFERENCES tasks(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (task_id, blocked_by_task_id)
);

CREATE TABLE IF NOT EXISTS task_entity_links (
  project_id TEXT NOT NULL REFERENCES projects(id),
  task_id TEXT NOT NULL REFERENCES tasks(id),
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (task_id, entity_kind, entity_id, relationship)
);

CREATE TABLE IF NOT EXISTS task_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  task_id TEXT NOT NULL REFERENCES tasks(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  actor_agent_id TEXT REFERENCES agents(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analysis_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id TEXT NOT NULL REFERENCES analyses(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hypothesis_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hypothesis_id TEXT NOT NULL REFERENCES hypotheses(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS experiment_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experiment_id TEXT NOT NULL REFERENCES experiments(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluation_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  actor TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  associated_entity_kind TEXT NOT NULL,
  associated_entity_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  path TEXT NOT NULL,
  media_type TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_message_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  agent_id TEXT REFERENCES agents(id),
  agent_name TEXT NOT NULL,
  pydantic_run_id TEXT,
  conversation_id TEXT,
  messages_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  associated_project_id TEXT REFERENCES projects(id),
  associated_session_id TEXT REFERENCES sessions(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
"""


def run_migrations(connection: sqlite3.Connection) -> None:
    with connection:
        reset_stale_schema(connection)
        connection.executescript(SCHEMA_SQL)
        upgrade_schema(connection)


def reset_stale_schema(connection: sqlite3.Connection) -> None:
    if not has_stale_schema(connection):
        return

    connection.execute("PRAGMA foreign_keys = OFF")
    for table in (
        "project_config",
        "workspaces",
        "projects",
        "sessions",
        "objectives",
        "research_contexts",
        "hypotheses",
        "baselines",
        "experiments",
        "evaluations",
        "analyses",
        "hypothesis_experiment_links",
        "agents",
        "tasks",
        "task_dependencies",
        "task_entity_links",
        "task_activities",
        "analysis_activities",
        "hypothesis_activities",
        "experiment_activities",
        "evaluation_activities",
        "measurements",
        "artifacts",
        "agent_message_history",
        "events",
    ):
        connection.execute(f"DROP TABLE IF EXISTS {table}")
    connection.execute("PRAGMA foreign_keys = ON")


def has_stale_schema(connection: sqlite3.Connection) -> bool:
    if table_exists(connection, "project_config"):
        return True

    if not table_exists(connection, "workspaces"):
        return table_exists(connection, "projects")

    if not table_exists(connection, "projects"):
        return False

    project_columns = table_columns(connection, "projects")
    if "workspace_id" not in project_columns or "objective" not in project_columns:
        return True

    session_columns = table_columns(connection, "sessions")
    if "workspace_id" not in session_columns:
        return True

    if table_exists(connection, "objectives") or table_exists(connection, "research_contexts"):
        return True

    hypothesis_columns = table_columns(connection, "hypotheses")
    if (
        "project_id" not in hypothesis_columns
        or "session_id" in hypothesis_columns
        or "objective_id" in hypothesis_columns
    ):
        return True

    experiment_columns = table_columns(connection, "experiments")
    if "project_id" not in experiment_columns or "session_id" in experiment_columns:
        return True

    evaluation_columns = table_columns(connection, "evaluations")
    if "project_id" not in evaluation_columns or "session_id" in evaluation_columns:
        return True

    analysis_columns = table_columns(connection, "analyses")
    if (
        "project_id" not in analysis_columns
        or "session_id" in analysis_columns
        or "created_in_session_id" not in analysis_columns
        or "kind" in analysis_columns
        or "content" not in analysis_columns
        or "supersedes_analysis_id" not in analysis_columns
    ):
        return True

    if not table_exists(connection, "analysis_activities"):
        return True

    artifact_columns = table_columns(connection, "artifacts")
    if "project_id" not in artifact_columns or "session_id" in artifact_columns:
        return True

    activity_columns = table_columns(connection, "experiment_activities")
    if "session_id" in activity_columns or "created_in_session_id" not in activity_columns:
        return True

    agent_columns = table_columns(connection, "agents")
    if "project_id" not in agent_columns or "session_id" in agent_columns:
        return True

    task_columns = table_columns(connection, "tasks")
    if (
        "project_id" not in task_columns
        or "session_id" in task_columns
        or "created_in_session_id" not in task_columns
        or "claimed_in_session_id" not in task_columns
        or "completed_in_session_id" not in task_columns
    ):
        return True

    dependency_columns = table_columns(connection, "task_dependencies")
    if "project_id" not in dependency_columns:
        return True

    task_link_columns = table_columns(connection, "task_entity_links")
    if "project_id" not in task_link_columns:
        return True

    task_activity_columns = table_columns(connection, "task_activities")
    if (
        "project_id" not in task_activity_columns
        or "created_in_session_id" not in task_activity_columns
    ):
        return True

    history_columns = table_columns(connection, "agent_message_history")
    if (
        "project_id" not in history_columns
        or "session_id" in history_columns
        or "created_in_session_id" not in history_columns
    ):
        return True

    event_columns = table_columns(connection, "events")
    if (
        "associated_project_id" not in event_columns
        or "associated_session_id" not in event_columns
        or "session_id" in event_columns
    ):
        return True

    return False


def upgrade_schema(connection: sqlite3.Connection) -> None:
    if table_exists(connection, "evaluations"):
        evaluation_columns = table_columns(connection, "evaluations")
        if "associated_baseline_id" not in evaluation_columns:
            connection.execute(
                "ALTER TABLE evaluations ADD COLUMN associated_baseline_id TEXT "
                "REFERENCES baselines(id)"
            )
        migrate_baseline_like_evaluations(connection)

    if table_exists(connection, "evaluation_activities"):
        connection.execute(
            "UPDATE evaluation_activities SET kind = 'result' WHERE kind = 'comment'"
        )


def migrate_baseline_like_evaluations(connection: sqlite3.Connection) -> None:
    if not table_exists(connection, "baselines"):
        return

    now = utc_now()
    rows = connection.execute(
        """
        SELECT DISTINCT project_id
        FROM evaluations
        WHERE associated_experiment_id IS NULL
          AND associated_baseline_id IS NULL
        """
    ).fetchall()
    for row in rows:
        project_id = row["project_id"]
        baseline_id = f"baseline_{project_id}_default"
        connection.execute(
            """
            INSERT OR IGNORE INTO baselines
              (id, project_id, created_in_session_id, status, title, summary,
               created_at, updated_at)
            VALUES (?, ?, NULL, 'open', 'Default baseline',
                    'Migrated baseline for existing baseline-like evaluations.',
                    ?, ?)
            """,
            (baseline_id, project_id, now, now),
        )
        connection.execute(
            """
            UPDATE evaluations
            SET associated_baseline_id = ?
            WHERE project_id = ?
              AND associated_experiment_id IS NULL
              AND associated_baseline_id IS NULL
            """,
            (baseline_id, project_id),
        )


def table_exists(connection: sqlite3.Connection, table: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    return row is not None


def table_columns(connection: sqlite3.Connection, table: str) -> set[str]:
    if not table_exists(connection, table):
        return set()
    return {row[1] for row in connection.execute(f"PRAGMA table_info({table})")}
