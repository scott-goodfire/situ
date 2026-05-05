from __future__ import annotations

import sqlite3


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS project_config (
  id TEXT PRIMARY KEY,
  repo_path TEXT NOT NULL,
  research_context TEXT NOT NULL,
  associated_session_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS objectives (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  associated_session_id TEXT REFERENCES sessions(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  objective_id TEXT NOT NULL REFERENCES objectives(id),
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hypotheses (
  id TEXT PRIMARY KEY,
  objective_id TEXT NOT NULL REFERENCES objectives(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL,
  associated_session_id TEXT REFERENCES sessions(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  objective_id TEXT NOT NULL REFERENCES objectives(id),
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  associated_session_id TEXT REFERENCES sessions(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hypothesis_experiment_links (
  hypothesis_id TEXT NOT NULL REFERENCES hypotheses(id),
  experiment_id TEXT NOT NULL REFERENCES experiments(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (hypothesis_id, experiment_id)
);

CREATE TABLE IF NOT EXISTS hypothesis_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hypothesis_id TEXT NOT NULL REFERENCES hypotheses(id),
  session_id TEXT REFERENCES sessions(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS experiment_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experiment_id TEXT NOT NULL REFERENCES experiments(id),
  session_id TEXT REFERENCES sessions(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  objective_id TEXT NOT NULL REFERENCES objectives(id),
  associated_session_id TEXT REFERENCES sessions(id),
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
  session_id TEXT NOT NULL REFERENCES sessions(id),
  agent_name TEXT NOT NULL,
  pydantic_run_id TEXT,
  conversation_id TEXT,
  messages_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT REFERENCES sessions(id),
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


def reset_stale_schema(connection: sqlite3.Connection) -> None:
    if not has_stale_schema(connection):
        return

    connection.execute("PRAGMA foreign_keys = OFF")
    for table in (
        "project_config",
        "objectives",
        "sessions",
        "hypotheses",
        "experiments",
        "hypothesis_experiment_links",
        "hypothesis_activities",
        "experiment_activities",
        "artifacts",
        "agent_message_history",
        "events",
    ):
        connection.execute(f"DROP TABLE IF EXISTS {table}")
    connection.execute("PRAGMA foreign_keys = ON")


def has_stale_schema(connection: sqlite3.Connection) -> bool:
    if not table_exists(connection, "project_config"):
        return False

    project_config_columns = table_columns(connection, "project_config")
    experiment_columns = table_columns(connection, "experiments")
    activity_columns = table_columns(connection, "experiment_activities")

    return (
        "research_context" not in project_config_columns
        or "associated_session_id" not in experiment_columns
        or has_non_comment_activity_kinds(connection, activity_columns)
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


def has_non_comment_activity_kinds(
    connection: sqlite3.Connection,
    columns: set[str],
) -> bool:
    if "kind" not in columns:
        return False
    row = connection.execute(
        """
        SELECT 1 FROM experiment_activities
        WHERE kind != 'comment'
        LIMIT 1
        """
    ).fetchone()
    return row is not None
