from __future__ import annotations

import sqlite3
import threading
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from .migrations import run_migrations


class Database:
    def __init__(
        self,
        path: Path,
        *,
        workspace_id: str | None = None,
        project_id: str | None = None,
        repo_path: str,
    ) -> None:
        self.path = path
        self.workspace_id = workspace_id or project_id
        if self.workspace_id is None:
            raise ValueError("workspace_id is required")
        self.project_id = self.workspace_id
        self.repo_path = repo_path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._db = sqlite3.connect(self.path, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._db.execute("PRAGMA journal_mode = WAL")
        self._db.execute("PRAGMA foreign_keys = ON")
        run_migrations(self._db)

    def execute(self, sql: str, params: Sequence[Any] = ()) -> sqlite3.Cursor:
        with self._lock, self._db:
            return self._db.execute(sql, tuple(params))

    def fetchone(self, sql: str, params: Sequence[Any] = ()) -> sqlite3.Row | None:
        with self._lock:
            return self._db.execute(sql, tuple(params)).fetchone()

    def fetchall(self, sql: str, params: Sequence[Any] = ()) -> list[sqlite3.Row]:
        with self._lock:
            return list(self._db.execute(sql, tuple(params)).fetchall())

    def close(self) -> None:
        with self._lock:
            self._db.close()
