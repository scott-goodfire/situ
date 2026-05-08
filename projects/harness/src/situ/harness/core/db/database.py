from __future__ import annotations

import sqlite3
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import aiofiles.os
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
        async with aiosqlite.connect(self.path) as db:
            await self._configure(db)
            await run_migrations(db)
            await db.commit()
        self._initialized = True

    async def execute(self, sql: str, params: Sequence[Any] = ()) -> CursorResult:
        await self.initialize()
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
        await self.initialize()
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
        await self.initialize()
        async with aiosqlite.connect(self.path) as db:
            await self._configure(db)
            cursor = await db.execute(sql, tuple(params))
            rows = await cursor.fetchall()
            await cursor.close()
            return list(rows)

    async def _configure(self, db: aiosqlite.Connection) -> None:
        db.row_factory = sqlite3.Row
        await db.execute("PRAGMA journal_mode = WAL")
        await db.execute("PRAGMA foreign_keys = ON")
