from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest
from situ.harness.core.db import Database
from situ.harness.core.db.migrations import DATABASE_SCHEMA_VERSION

pytestmark = pytest.mark.asyncio


async def test_database_initialization_sets_schema_version(tmp_path: Path) -> None:
    db_path = tmp_path / "situ.sqlite"

    await Database.open(
        db_path,
        workspace_id="W1",
        repo_path="/tmp/project",
    )

    with sqlite3.connect(db_path) as connection:
        version = connection.execute("PRAGMA user_version").fetchone()[0]
        task_columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info(tasks)").fetchall()
        }
        work_item_columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info(work_items)").fetchall()
        }
        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }
        continuation_claim_columns = {
            row[1]
            for row in connection.execute(
                "PRAGMA table_info(continuation_claims)"
            ).fetchall()
        }

    assert version == DATABASE_SCHEMA_VERSION
    assert "work_type" in task_columns
    assert "workflow_id" in task_columns
    assert "target_kind" in work_item_columns
    assert "lease_expires_at" in work_item_columns
    assert "continuation_claims" in tables
    assert "claim_key" in continuation_claim_columns


async def test_database_initialization_preserves_compatible_database(
    tmp_path: Path,
) -> None:
    db_path = tmp_path / "situ.sqlite"
    now = "2026-05-08T00:00:00+00:00"
    db = await Database.open(
        db_path,
        workspace_id="W1",
        repo_path="/tmp/project",
    )
    await db.execute(
        """
        INSERT INTO workspaces (id, repo_path, created_at, updated_at)
        VALUES ('W1', '/tmp/project', ?, ?)
        """,
        (now, now),
    )

    await Database.open(
        db_path,
        workspace_id="W1",
        repo_path="/tmp/project",
    )

    with sqlite3.connect(db_path) as connection:
        rows = connection.execute("SELECT id FROM workspaces").fetchall()
    assert rows == [("W1",)]


async def test_database_initialization_recreates_incompatible_database(
    tmp_path: Path,
) -> None:
    db_path = tmp_path / "situ.sqlite"
    wal_path = db_path.with_name(f"{db_path.name}-wal")
    shm_path = db_path.with_name(f"{db_path.name}-shm")
    project_dir = tmp_path / "projects" / "W1"
    project_dir.mkdir(parents=True)
    dbos_path = project_dir / "dbos.sqlite"
    dbos_log_path = project_dir / "dbos.db-log"
    dbos_wal_path = project_dir / "dbos.sqlite-wal"
    session_path = project_dir / "session.json"
    with sqlite3.connect(db_path) as connection:
        connection.execute("CREATE TABLE legacy_data (id TEXT PRIMARY KEY)")
        connection.execute("INSERT INTO legacy_data (id) VALUES ('old')")
        connection.execute("PRAGMA user_version = 0")
    wal_path.write_text("legacy wal", encoding="utf-8")
    shm_path.write_text("legacy shm", encoding="utf-8")
    dbos_path.write_text("legacy dbos", encoding="utf-8")
    dbos_log_path.write_text("legacy dbos log", encoding="utf-8")
    dbos_wal_path.write_text("legacy dbos wal", encoding="utf-8")
    session_path.write_text("legacy session", encoding="utf-8")

    await Database.open(
        db_path,
        workspace_id="W1",
        repo_path="/tmp/project",
    )

    with sqlite3.connect(db_path) as connection:
        version = connection.execute("PRAGMA user_version").fetchone()[0]
        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }

    assert version == DATABASE_SCHEMA_VERSION
    assert "legacy_data" not in tables
    assert "tasks" in tables
    assert "work_items" in tables
    assert not wal_path.exists() or wal_path.read_bytes() != b"legacy wal"
    assert not shm_path.exists() or shm_path.read_bytes() != b"legacy shm"
    assert not dbos_path.exists()
    assert not dbos_log_path.exists()
    assert not dbos_wal_path.exists()
    assert not session_path.exists()
