from __future__ import annotations

import sqlite3


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  repo_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS objectives (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_contexts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hypotheses (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  associated_experiment_id TEXT REFERENCES experiments(id),
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
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS experiment_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experiment_id TEXT NOT NULL REFERENCES experiments(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluation_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
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
        "projects",
        "sessions",
        "objectives",
        "research_contexts",
        "hypotheses",
        "experiments",
        "evaluations",
        "hypothesis_experiment_links",
        "hypothesis_activities",
        "experiment_activities",
        "evaluation_activities",
        "artifacts",
        "agent_message_history",
        "events",
    ):
        connection.execute(f"DROP TABLE IF EXISTS {table}")
    connection.execute("PRAGMA foreign_keys = ON")


def has_stale_schema(connection: sqlite3.Connection) -> bool:
    if table_exists(connection, "project_config"):
        return True

    if not table_exists(connection, "projects"):
        return False

    session_columns = table_columns(connection, "sessions")
    if "project_id" not in session_columns:
        return True

    if not table_exists(connection, "research_contexts"):
        return True

    objective_columns = table_columns(connection, "objectives")
    if "session_id" not in objective_columns:
        return True

    hypothesis_columns = table_columns(connection, "hypotheses")
    if "session_id" not in hypothesis_columns or "objective_id" in hypothesis_columns:
        return True

    activity_columns = table_columns(connection, "experiment_activities")
    if "session_id" in activity_columns:
        return True

    return False


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
