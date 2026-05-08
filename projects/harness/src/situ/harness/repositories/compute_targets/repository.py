from __future__ import annotations

from typing import Any

from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...core.ids import (
    RECORD_ID_PREFIXES,
    ensure_canonical_record_id,
    next_canonical_record_id,
)
from ...records import (
    ComputeTargetKind,
    ComputeTargetRecord,
    ComputeTargetStatus,
    parse_compute_target_kind,
    parse_compute_target_status,
)
from ..base import BaseRepository

COMPUTE_TARGET_ID_PREFIX = RECORD_ID_PREFIXES["compute_target"]


def _compute_target_row(row: Any) -> ComputeTargetRecord:
    return ComputeTargetRecord(
        id=row["id"],
        pool=row["pool"],
        kind=row["kind"],
        label=row["label"],
        status=row["status"],
        claimed_by_task_id=row["claimed_by_task_id"],
        claimed_at=row["claimed_at"],
        last_heartbeat=row["last_heartbeat"],
        metadata=json_loads(row["metadata_json"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class ComputeTargetsRepository(BaseRepository):
    async def register(
        self,
        *,
        target_id: str | None = None,
        pool: str,
        kind: ComputeTargetKind | str = ComputeTargetKind.LOCAL,
        label: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ComputeTargetRecord:
        checked_kind = parse_compute_target_kind(kind)
        resolved_id = target_id or await self.next_id()
        ensure_canonical_record_id(
            record_id=resolved_id,
            prefix=COMPUTE_TARGET_ID_PREFIX,
            noun="compute target",
        )
        now = utc_now()
        await self.db.execute(
            """
            INSERT INTO compute_targets
              (id, pool, kind, label, status,
               claimed_by_task_id, claimed_at, last_heartbeat, metadata_json,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)
            """,
            (
                resolved_id,
                pool,
                checked_kind.value,
                label,
                ComputeTargetStatus.IDLE.value,
                json_dumps(metadata or {}),
                now,
                now,
            ),
        )
        record = await self.get(target_id=resolved_id)
        if record is None:
            raise RuntimeError(f"compute target was not persisted: {resolved_id}")
        return record

    async def get(self, *, target_id: str) -> ComputeTargetRecord | None:
        row = await self.db.fetchone(
            "SELECT * FROM compute_targets WHERE id = ?",
            (target_id,),
        )
        return _compute_target_row(row) if row else None

    async def list_all(self) -> list[ComputeTargetRecord]:
        rows = await self.db.fetchall(
            "SELECT * FROM compute_targets ORDER BY pool, created_at"
        )
        return [_compute_target_row(row) for row in rows]

    async def list_for_pool(self, *, pool: str) -> list[ComputeTargetRecord]:
        rows = await self.db.fetchall(
            "SELECT * FROM compute_targets WHERE pool = ? ORDER BY created_at",
            (pool,),
        )
        return [_compute_target_row(row) for row in rows]

    async def list_active_for_pool(self, *, pool: str) -> list[ComputeTargetRecord]:
        rows = await self.db.fetchall(
            """
            SELECT * FROM compute_targets
            WHERE pool = ? AND status IN (?, ?)
            ORDER BY created_at
            """,
            (
                pool,
                ComputeTargetStatus.IDLE.value,
                ComputeTargetStatus.CLAIMED.value,
            ),
        )
        return [_compute_target_row(row) for row in rows]

    async def list_claimed(self) -> list[ComputeTargetRecord]:
        rows = await self.db.fetchall(
            """
            SELECT * FROM compute_targets
            WHERE status = ?
               OR (status = ? AND claimed_by_task_id IS NOT NULL)
            """,
            (ComputeTargetStatus.CLAIMED.value, ComputeTargetStatus.DRAINING.value),
        )
        return [_compute_target_row(row) for row in rows]

    async def claim_for_pool(
        self,
        *,
        pool: str,
        task_id: str,
    ) -> ComputeTargetRecord | None:
        candidates = await self.db.fetchall(
            """
            SELECT id FROM compute_targets
            WHERE pool = ? AND status = ?
            ORDER BY created_at
            """,
            (pool, ComputeTargetStatus.IDLE.value),
        )
        now = utc_now()
        for row in candidates:
            target_id = row["id"]
            cursor = await self.db.execute(
                """
                UPDATE compute_targets
                SET status = ?,
                    claimed_by_task_id = ?,
                    claimed_at = ?,
                    last_heartbeat = ?,
                    updated_at = ?
                WHERE id = ?
                  AND pool = ?
                  AND status = ?
                """,
                (
                    ComputeTargetStatus.CLAIMED.value,
                    task_id,
                    now,
                    now,
                    now,
                    target_id,
                    pool,
                    ComputeTargetStatus.IDLE.value,
                ),
            )
            if cursor.rowcount == 1:
                return await self.get(target_id=target_id)
        return None

    async def release(
        self,
        *,
        target_id: str,
        owning_task_id: str | None = None,
    ) -> ComputeTargetRecord | None:
        current = await self.get(target_id=target_id)
        if current is None:
            return None
        if current.status not in {
            ComputeTargetStatus.CLAIMED,
            ComputeTargetStatus.DRAINING,
        }:
            return current
        if owning_task_id is not None and current.claimed_by_task_id != owning_task_id:
            return current
        now = utc_now()
        next_status = (
            ComputeTargetStatus.DEAD
            if current.status == ComputeTargetStatus.DRAINING
            else ComputeTargetStatus.IDLE
        )
        await self.db.execute(
            """
            UPDATE compute_targets
            SET status = ?,
                claimed_by_task_id = NULL,
                claimed_at = NULL,
                updated_at = ?
            WHERE id = ?
              AND status = ?
            """,
            (next_status.value, now, target_id, current.status.value),
        )
        return await self.get(target_id=target_id)

    async def heartbeat(self, *, target_id: str) -> ComputeTargetRecord | None:
        now = utc_now()
        await self.db.execute(
            """
            UPDATE compute_targets
            SET last_heartbeat = ?, updated_at = ?
            WHERE id = ?
            """,
            (now, now, target_id),
        )
        return await self.get(target_id=target_id)

    async def drain(self, *, target_id: str) -> ComputeTargetRecord | None:
        current = await self.get(target_id=target_id)
        if current is None:
            return None
        if current.status in {ComputeTargetStatus.DEAD, ComputeTargetStatus.DRAINING}:
            return current
        now = utc_now()
        await self.db.execute(
            "UPDATE compute_targets SET status = ?, updated_at = ? WHERE id = ?",
            (ComputeTargetStatus.DRAINING.value, now, target_id),
        )
        return await self.get(target_id=target_id)

    async def mark_dead(self, *, target_id: str) -> ComputeTargetRecord | None:
        current = await self.get(target_id=target_id)
        if current is None:
            return None
        now = utc_now()
        await self.db.execute(
            """
            UPDATE compute_targets
            SET status = ?,
                claimed_by_task_id = NULL,
                claimed_at = NULL,
                updated_at = ?
            WHERE id = ?
            """,
            (ComputeTargetStatus.DEAD.value, now, target_id),
        )
        return await self.get(target_id=target_id)

    async def remove(self, *, target_id: str) -> ComputeTargetRecord | None:
        return await self.mark_dead(target_id=target_id)

    async def count_idle_for_pool(self, *, pool: str) -> int:
        row = await self.db.fetchone(
            "SELECT COUNT(*) AS count FROM compute_targets WHERE pool = ? AND status = ?",
            (pool, ComputeTargetStatus.IDLE.value),
        )
        return int(row["count"]) if row is not None else 0

    async def pool_exists(self, *, pool: str) -> bool:
        row = await self.db.fetchone(
            """
            SELECT 1 FROM compute_targets
            WHERE pool = ? AND status != ?
            LIMIT 1
            """,
            (pool, ComputeTargetStatus.DEAD.value),
        )
        return row is not None

    async def next_id(self) -> str:
        rows = await self.db.fetchall("SELECT id FROM compute_targets")
        return next_canonical_record_id(
            existing_ids=(str(row["id"]) for row in rows),
            prefix=COMPUTE_TARGET_ID_PREFIX,
        )

    # parse_compute_target_status is exported for callers wiring CLI/tool inputs.
    @staticmethod
    def parse_status(status: str) -> ComputeTargetStatus:
        return parse_compute_target_status(status)
