from __future__ import annotations

import sqlite3
from pathlib import Path

from .serialization import utc_now


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY,
  repo_path TEXT,
  label TEXT,
  discovered_at TEXT NOT NULL,
  last_seen_at TEXT,
  last_opened_at TEXT,
  archived_at TEXT
);
"""


def upsert_project_registry(
    *,
    situ_home: Path,
    project_id: str,
    repo_path: Path,
) -> None:
    database_path = situ_home.expanduser() / "situ.sqlite"
    database_path.parent.mkdir(parents=True, exist_ok=True)
    now = utc_now()

    connection = sqlite3.connect(database_path)
    try:
        with connection:
            connection.executescript(SCHEMA_SQL)
            connection.execute(
                """
                INSERT INTO projects
                  (project_id, repo_path, label, discovered_at,
                   last_seen_at, last_opened_at, archived_at)
                VALUES (?, ?, ?, ?, ?, ?, NULL)
                ON CONFLICT(project_id) DO UPDATE SET
                  repo_path = excluded.repo_path,
                  label = excluded.label,
                  last_seen_at = excluded.last_seen_at,
                  last_opened_at = excluded.last_opened_at,
                  archived_at = NULL
                """,
                (
                    project_id,
                    str(repo_path),
                    repo_path.name or str(repo_path),
                    now,
                    now,
                    now,
                ),
            )
    finally:
        connection.close()
