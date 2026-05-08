from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from ...core.db.serialization import json_dumps, json_loads, utc_now
from ..base import BaseRepository

CollectionOperation = Literal["upsert", "delete"]


@dataclass(frozen=True, slots=True)
class CollectionChange:
    cursor: int
    scope_id: str
    collection: str
    key: str
    op: CollectionOperation
    record: dict[str, Any] | None
    source_event_id: int | None
    created_at: str


def _collection_change_row(row: Any) -> CollectionChange:
    record_json = row["record_json"]
    return CollectionChange(
        cursor=row["scope_seq"],
        scope_id=row["scope_id"],
        collection=row["collection"],
        key=row["record_key"],
        op=row["operation"],
        record=json_loads(record_json) if record_json is not None else None,
        source_event_id=row["source_event_id"],
        created_at=row["created_at"],
    )


class CollectionChangesRepository(BaseRepository):
    async def append_upsert(
        self,
        *,
        scope_id: str,
        collection: str,
        key: str,
        record: dict[str, Any],
        source_event_id: int | None = None,
    ) -> CollectionChange:
        return await self._append(
            scope_id=scope_id,
            collection=collection,
            key=key,
            op="upsert",
            record=record,
            source_event_id=source_event_id,
        )

    async def append_delete(
        self,
        *,
        scope_id: str,
        collection: str,
        key: str,
        source_event_id: int | None = None,
    ) -> CollectionChange:
        return await self._append(
            scope_id=scope_id,
            collection=collection,
            key=key,
            op="delete",
            record=None,
            source_event_id=source_event_id,
        )

    async def current_cursor(self, *, scope_id: str) -> int:
        row = await self.db.fetchone(
            "SELECT COALESCE(MAX(scope_seq), 0) AS cursor FROM collection_changes WHERE scope_id = ?",
            (scope_id,),
        )
        return int(row["cursor"]) if row is not None else 0

    async def list_since(
        self,
        *,
        scope_id: str,
        cursor: int,
        limit: int,
    ) -> list[CollectionChange]:
        return [
            _collection_change_row(row)
            for row in await self.db.fetchall(
                """
                SELECT *
                FROM collection_changes
                WHERE scope_id = ? AND scope_seq > ?
                ORDER BY scope_seq
                LIMIT ?
                """,
                (scope_id, cursor, limit),
            )
        ]

    async def latest_for_record(
        self,
        *,
        scope_id: str,
        collection: str,
        key: str,
    ) -> CollectionChange | None:
        row = await self.db.fetchone(
            """
            SELECT *
            FROM collection_changes
            WHERE scope_id = ?
              AND collection = ?
              AND record_key = ?
            ORDER BY scope_seq DESC
            LIMIT 1
            """,
            (scope_id, collection, key),
        )
        return _collection_change_row(row) if row is not None else None

    async def _append(
        self,
        *,
        scope_id: str,
        collection: str,
        key: str,
        op: CollectionOperation,
        record: dict[str, Any] | None,
        source_event_id: int | None,
    ) -> CollectionChange:
        async with self.db.connect() as db:
            await db.execute("BEGIN IMMEDIATE")
            cursor = await db.execute(
                """
                SELECT COALESCE(MAX(scope_seq), 0) + 1 AS next_cursor
                FROM collection_changes
                WHERE scope_id = ?
                """,
                (scope_id,),
            )
            row = await cursor.fetchone()
            await cursor.close()
            next_cursor = int(row["next_cursor"])
            await db.execute(
                """
                INSERT INTO collection_changes
                  (scope_id, scope_seq, collection, record_key, operation,
                   record_json, source_event_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    scope_id,
                    next_cursor,
                    collection,
                    key,
                    op,
                    json_dumps(record) if record is not None else None,
                    source_event_id,
                    utc_now(),
                ),
            )
            await db.commit()

        row = await self.db.fetchone(
            """
            SELECT *
            FROM collection_changes
            WHERE scope_id = ? AND scope_seq = ?
            """,
            (scope_id, next_cursor),
        )
        if row is None:
            raise RuntimeError("collection change was not persisted")
        return _collection_change_row(row)
