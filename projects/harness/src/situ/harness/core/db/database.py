from __future__ import annotations

import sqlite3
from collections.abc import AsyncIterator, Sequence
from contextlib import asynccontextmanager
from contextlib import suppress
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import aiofiles.os
import aiosqlite

from ...config import DEFAULTS
from .migrations import DATABASE_SCHEMA_VERSION, run_migrations


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
        self._initialized = False

    @classmethod
    async def open(
        cls,
        path: Path,
        *,
        workspace_id: str | None = None,
        project_id: str | None = None,
        repo_path: str,
    ) -> "Database":
        db = cls(
            path,
            workspace_id=workspace_id,
            project_id=project_id,
            repo_path=repo_path,
        )
        await db.initialize()
        return db

    async def initialize(self) -> None:
        if self._initialized:
            return
        await aiofiles.os.makedirs(self.path.parent, exist_ok=True)
        await self._reset_if_incompatible()
        async with aiosqlite.connect(
            self.path,
            timeout=DEFAULTS.dbos_sqlite_busy_timeout_seconds,
        ) as db:
            await self._configure(db)
            await run_migrations(db)
            await db.commit()
        self._initialized = True

    async def execute(self, sql: str, params: Sequence[Any] = ()) -> CursorResult:
        await self.initialize()
        async with aiosqlite.connect(
            self.path,
            timeout=DEFAULTS.dbos_sqlite_busy_timeout_seconds,
        ) as db:
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
        await self.initialize()
        async with aiosqlite.connect(
            self.path,
            timeout=DEFAULTS.dbos_sqlite_busy_timeout_seconds,
        ) as db:
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
        await self.initialize()
        async with aiosqlite.connect(
            self.path,
            timeout=DEFAULTS.dbos_sqlite_busy_timeout_seconds,
        ) as db:
            await self._configure(db)
            cursor = await db.execute(sql, tuple(params))
            rows = await cursor.fetchall()
            await cursor.close()
            return list(rows)

    @asynccontextmanager
    async def connect(self) -> AsyncIterator[aiosqlite.Connection]:
        await self.initialize()
        async with aiosqlite.connect(
            self.path,
            timeout=DEFAULTS.dbos_sqlite_busy_timeout_seconds,
        ) as db:
            await self._configure(db)
            yield db

    async def _configure(self, db: aiosqlite.Connection) -> None:
        db.row_factory = sqlite3.Row
        await db.create_function("situ_workspace_id", 0, lambda: self.workspace_id)
        await db.execute(
            f"PRAGMA busy_timeout = {int(DEFAULTS.dbos_sqlite_busy_timeout_seconds * 1000)}"
        )
        await db.execute("PRAGMA journal_mode = WAL")
        await db.execute(f"PRAGMA synchronous = {DEFAULTS.dbos_sqlite_synchronous}")
        await db.execute("PRAGMA foreign_keys = ON")

    async def _reset_if_incompatible(self) -> None:
        if not self.path.exists():
            return

        try:
            async with aiosqlite.connect(
                self.path,
                timeout=DEFAULTS.dbos_sqlite_busy_timeout_seconds,
            ) as db:
                cursor = await db.execute("PRAGMA user_version")
                row = await cursor.fetchone()
                await cursor.close()
        except sqlite3.DatabaseError:
            row = None

        version = int(row[0]) if row is not None else 0
        if version == DATABASE_SCHEMA_VERSION:
            return

        for path in (
            self.path,
            self.path.with_name(f"{self.path.name}-wal"),
            self.path.with_name(f"{self.path.name}-shm"),
        ):
            with suppress(FileNotFoundError):
                path.unlink()
        await self._reset_project_runtime_state()

    async def _reset_project_runtime_state(self) -> None:
        projects_dir = self.path.parent / "projects"
        if not projects_dir.is_dir():
            return

        for project_dir in projects_dir.iterdir():
            if not project_dir.is_dir():
                continue
            for path in (
                project_dir / "dbos.sqlite",
                project_dir / "dbos.db-log",
                project_dir / "dbos.sqlite-wal",
                project_dir / "dbos.sqlite-shm",
                project_dir / "session.json",
            ):
                with suppress(FileNotFoundError):
                    path.unlink()
