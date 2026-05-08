from __future__ import annotations

import asyncio
import sqlite3
import threading
from collections.abc import Coroutine, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import aiosqlite

from .migrations import run_migrations


@dataclass(frozen=True, slots=True)
class CursorResult:
    lastrowid: int | None
    rowcount: int


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
        self._sync_lock = threading.Lock()
        self._run_migrations()

    async def execute(self, sql: str, params: Sequence[Any] = ()) -> CursorResult:
        async with aiosqlite.connect(self.path) as db:
            await self._configure(db)
            cursor = await db.execute(sql, tuple(params))
            await db.commit()
            result = CursorResult(lastrowid=cursor.lastrowid, rowcount=cursor.rowcount)
            await cursor.close()
            return result

    async def fetchone(
        self,
        sql: str,
        params: Sequence[Any] = (),
    ) -> sqlite3.Row | None:
        async with aiosqlite.connect(self.path) as db:
            await self._configure(db)
            cursor = await db.execute(sql, tuple(params))
            row = await cursor.fetchone()
            await cursor.close()
            return row

    async def fetchall(
        self,
        sql: str,
        params: Sequence[Any] = (),
    ) -> list[sqlite3.Row]:
        async with aiosqlite.connect(self.path) as db:
            await self._configure(db)
            cursor = await db.execute(sql, tuple(params))
            rows = await cursor.fetchall()
            await cursor.close()
            return list(rows)

    def execute_blocking(self, sql: str, params: Sequence[Any] = ()) -> CursorResult:
        return self._run_blocking(self.execute(sql, params))

    def fetchone_blocking(
        self,
        sql: str,
        params: Sequence[Any] = (),
    ) -> sqlite3.Row | None:
        return self._run_blocking(self.fetchone(sql, params))

    def fetchall_blocking(
        self,
        sql: str,
        params: Sequence[Any] = (),
    ) -> list[sqlite3.Row]:
        return self._run_blocking(self.fetchall(sql, params))

    async def close(self) -> None:
        return None

    def close_blocking(self) -> None:
        return None

    def _run_migrations(self) -> None:
        with sqlite3.connect(self.path) as db:
            db.row_factory = sqlite3.Row
            db.execute("PRAGMA journal_mode = WAL")
            db.execute("PRAGMA foreign_keys = ON")
            run_migrations(db)

    async def _configure(self, db: aiosqlite.Connection) -> None:
        db.row_factory = sqlite3.Row
        await db.execute("PRAGMA journal_mode = WAL")
        await db.execute("PRAGMA foreign_keys = ON")

    def _run_blocking(self, awaitable: Coroutine[Any, Any, Any]) -> Any:
        with self._sync_lock:
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                return asyncio.run(awaitable)
            awaitable.close()
            raise RuntimeError("Database blocking methods cannot run in an event loop")
