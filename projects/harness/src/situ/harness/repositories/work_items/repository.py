from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...core.ids import (
    RECORD_ID_PREFIXES,
    ensure_canonical_record_id,
    next_canonical_record_id,
)
from ...records import (
    WorkItemPurpose,
    WorkItemRecord,
    WorkItemStatus,
    parse_work_item_purpose,
    parse_work_item_status,
)
from ..base import BaseRepository

WORK_ITEM_ID_PREFIX = RECORD_ID_PREFIXES["work_item"]
OPEN_WORK_ITEM_STATUSES = (WorkItemStatus.PENDING, WorkItemStatus.CLAIMED)


def _utc_now_and_offset(seconds: int) -> tuple[str, str]:
    now = datetime.now(UTC)
    return now.isoformat(), (now + timedelta(seconds=seconds)).isoformat()


def _work_item_row(row: Any) -> WorkItemRecord:
    return WorkItemRecord(
        id=row["id"],
        project_id=row["project_id"],
        created_in_session_id=row["created_in_session_id"],
        purpose=row["purpose"],
        target_kind=row["target_kind"],
        target_id=row["target_id"],
        status=row["status"],
        owner_workflow_id=row["owner_workflow_id"],
        attempt=row["attempt"],
        available_at=row["available_at"],
        claimed_at=row["claimed_at"],
        lease_expires_at=row["lease_expires_at"],
        completed_at=row["completed_at"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class WorkItemsRepository(BaseRepository):
    async def create(
        self,
        *,
        item_id: str | None = None,
        project_id: str,
        created_in_session_id: str | None = None,
        purpose: WorkItemPurpose | str,
        target_kind: str,
        target_id: str,
        payload: dict[str, Any] | None = None,
        available_at: str | None = None,
    ) -> WorkItemRecord:
        resolved_id = item_id or await self.next_id()
        ensure_canonical_record_id(
            record_id=resolved_id,
            prefix=WORK_ITEM_ID_PREFIX,
            noun="work item",
        )
        checked_purpose = parse_work_item_purpose(purpose)
        now = utc_now()
        await self.db.execute(
            """
            INSERT INTO work_items
              (id, project_id, created_in_session_id, purpose, target_kind,
               target_id, status, owner_workflow_id, attempt, available_at,
               claimed_at, lease_expires_at, completed_at, payload_json,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, NULL, NULL, NULL, ?, ?, ?)
            """,
            (
                resolved_id,
                project_id,
                created_in_session_id,
                checked_purpose.value,
                target_kind,
                target_id,
                WorkItemStatus.PENDING.value,
                available_at or now,
                json_dumps(payload or {}),
                now,
                now,
            ),
        )
        record = await self.get(item_id=resolved_id)
        if record is None:
            raise RuntimeError(f"work item was not persisted: {resolved_id}")
        return record

    async def ensure_open(
        self,
        *,
        project_id: str,
        created_in_session_id: str | None = None,
        purpose: WorkItemPurpose | str,
        target_kind: str,
        target_id: str,
        payload: dict[str, Any] | None = None,
        available_at: str | None = None,
    ) -> WorkItemRecord:
        checked_purpose = parse_work_item_purpose(purpose)
        existing = await self.get_open_for_target(
            project_id=project_id,
            purpose=checked_purpose,
            target_kind=target_kind,
            target_id=target_id,
        )
        if existing is not None:
            return existing

        resolved_id = await self.next_id()
        ensure_canonical_record_id(
            record_id=resolved_id,
            prefix=WORK_ITEM_ID_PREFIX,
            noun="work item",
        )
        now = utc_now()
        await self.db.execute(
            """
            INSERT OR IGNORE INTO work_items
              (id, project_id, created_in_session_id, purpose, target_kind,
               target_id, status, owner_workflow_id, attempt, available_at,
               claimed_at, lease_expires_at, completed_at, payload_json,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, NULL, NULL, NULL, ?, ?, ?)
            """,
            (
                resolved_id,
                project_id,
                created_in_session_id,
                checked_purpose.value,
                target_kind,
                target_id,
                WorkItemStatus.PENDING.value,
                available_at or now,
                json_dumps(payload or {}),
                now,
                now,
            ),
        )
        existing = await self.get_open_for_target(
            project_id=project_id,
            purpose=checked_purpose,
            target_kind=target_kind,
            target_id=target_id,
        )
        if existing is None:
            raise RuntimeError(
                f"open work item was not persisted for {target_kind}:{target_id}"
            )
        return existing

    async def get(self, *, item_id: str) -> WorkItemRecord | None:
        row = await self.db.fetchone(
            "SELECT * FROM work_items WHERE id = ?",
            (item_id,),
        )
        return _work_item_row(row) if row else None

    async def get_open_for_target(
        self,
        *,
        project_id: str,
        purpose: WorkItemPurpose | str,
        target_kind: str,
        target_id: str,
    ) -> WorkItemRecord | None:
        checked_purpose = parse_work_item_purpose(purpose)
        row = await self.db.fetchone(
            """
            SELECT * FROM work_items
            WHERE project_id = ?
              AND purpose = ?
              AND target_kind = ?
              AND target_id = ?
              AND status IN (?, ?)
            ORDER BY created_at
            LIMIT 1
            """,
            (
                project_id,
                checked_purpose.value,
                target_kind,
                target_id,
                WorkItemStatus.PENDING.value,
                WorkItemStatus.CLAIMED.value,
            ),
        )
        return _work_item_row(row) if row else None

    async def list_open_for_project(
        self,
        *,
        project_id: str,
        purpose: WorkItemPurpose | str,
    ) -> list[WorkItemRecord]:
        checked_purpose = parse_work_item_purpose(purpose)
        rows = await self.db.fetchall(
            """
            SELECT * FROM work_items
            WHERE project_id = ?
              AND purpose = ?
              AND status IN (?, ?)
            ORDER BY created_at
            """,
            (
                project_id,
                checked_purpose.value,
                WorkItemStatus.PENDING.value,
                WorkItemStatus.CLAIMED.value,
            ),
        )
        return [_work_item_row(row) for row in rows]

    async def list_for_project(
        self,
        *,
        project_id: str,
        purpose: WorkItemPurpose | str | None = None,
    ) -> list[WorkItemRecord]:
        if purpose is None:
            rows = await self.db.fetchall(
                """
                SELECT * FROM work_items
                WHERE project_id = ?
                ORDER BY created_at
                """,
                (project_id,),
            )
            return [_work_item_row(row) for row in rows]
        checked_purpose = parse_work_item_purpose(purpose)
        rows = await self.db.fetchall(
            """
            SELECT * FROM work_items
            WHERE project_id = ?
              AND purpose = ?
            ORDER BY created_at
            """,
            (project_id, checked_purpose.value),
        )
        return [_work_item_row(row) for row in rows]

    async def list_ready_for_project(
        self,
        *,
        project_id: str,
        purpose: WorkItemPurpose | str,
        limit: int | None = None,
    ) -> list[WorkItemRecord]:
        checked_purpose = parse_work_item_purpose(purpose)
        params: tuple[Any, ...] = (
            project_id,
            checked_purpose.value,
            WorkItemStatus.PENDING.value,
            utc_now(),
        )
        limit_sql = ""
        if limit is not None:
            limit_sql = "LIMIT ?"
            params = (*params, limit)
        rows = await self.db.fetchall(
            f"""
            SELECT * FROM work_items
            WHERE project_id = ?
              AND purpose = ?
              AND status = ?
              AND available_at <= ?
            ORDER BY created_at
            {limit_sql}
            """,
            params,
        )
        return [_work_item_row(row) for row in rows]

    async def claim_next(
        self,
        *,
        project_id: str,
        purpose: WorkItemPurpose | str,
        owner_workflow_id: str,
        lease_seconds: int,
    ) -> WorkItemRecord | None:
        checked_purpose = parse_work_item_purpose(purpose)
        await self.release_expired_claims(
            project_id=project_id,
            purpose=checked_purpose,
        )
        now = utc_now()
        rows = await self.db.fetchall(
            """
            SELECT id FROM work_items
            WHERE project_id = ?
              AND purpose = ?
              AND status = ?
              AND available_at <= ?
            ORDER BY created_at
            """,
            (
                project_id,
                checked_purpose.value,
                WorkItemStatus.PENDING.value,
                now,
            ),
        )
        for row in rows:
            claimed_at, lease_expires_at = _utc_now_and_offset(lease_seconds)
            cursor = await self.db.execute(
                """
                UPDATE work_items
                SET status = ?,
                    owner_workflow_id = ?,
                    attempt = attempt + 1,
                    claimed_at = ?,
                    lease_expires_at = ?,
                    updated_at = ?
                WHERE id = ?
                  AND status = ?
                  AND available_at <= ?
                """,
                (
                    WorkItemStatus.CLAIMED.value,
                    owner_workflow_id,
                    claimed_at,
                    lease_expires_at,
                    claimed_at,
                    row["id"],
                    WorkItemStatus.PENDING.value,
                    claimed_at,
                ),
            )
            if cursor.rowcount == 1:
                return await self.get(item_id=row["id"])
        return None

    async def release_expired_claims(
        self,
        *,
        project_id: str,
        purpose: WorkItemPurpose | str,
    ) -> int:
        checked_purpose = parse_work_item_purpose(purpose)
        now = utc_now()
        cursor = await self.db.execute(
            """
            UPDATE work_items
            SET status = ?,
                owner_workflow_id = NULL,
                claimed_at = NULL,
                lease_expires_at = NULL,
                available_at = ?,
                updated_at = ?
            WHERE project_id = ?
              AND purpose = ?
              AND status = ?
              AND lease_expires_at IS NOT NULL
              AND lease_expires_at <= ?
            """,
            (
                WorkItemStatus.PENDING.value,
                now,
                now,
                project_id,
                checked_purpose.value,
                WorkItemStatus.CLAIMED.value,
                now,
            ),
        )
        return cursor.rowcount

    async def requeue(
        self,
        *,
        item_id: str,
        available_at: str | None = None,
        payload: dict[str, Any] | None = None,
        owner_workflow_id: str | None = None,
    ) -> WorkItemRecord | None:
        current = await self.get(item_id=item_id)
        if current is None:
            return None
        now = utc_now()
        owner_filter = "AND owner_workflow_id = ?" if owner_workflow_id is not None else ""
        params: tuple[Any, ...] = (
            WorkItemStatus.PENDING.value,
            available_at or now,
            json_dumps(payload if payload is not None else current.payload),
            now,
            item_id,
        )
        if owner_workflow_id is not None:
            params = (*params, owner_workflow_id)
        cursor = await self.db.execute(
            f"""
            UPDATE work_items
            SET status = ?,
                owner_workflow_id = NULL,
                available_at = ?,
                claimed_at = NULL,
                lease_expires_at = NULL,
                completed_at = NULL,
                payload_json = ?,
                updated_at = ?
            WHERE id = ?
              {owner_filter}
            """,
            params,
        )
        return await self.get(item_id=item_id) if cursor.rowcount == 1 else None

    async def finish(
        self,
        *,
        item_id: str,
        status: WorkItemStatus | str = WorkItemStatus.DONE,
        payload: dict[str, Any] | None = None,
        owner_workflow_id: str | None = None,
    ) -> WorkItemRecord | None:
        checked_status = parse_work_item_status(status)
        if checked_status not in {
            WorkItemStatus.DONE,
            WorkItemStatus.FAILED,
            WorkItemStatus.CANCELED,
        }:
            raise ValueError(f"work item finish status must be terminal: {status!r}")
        current = await self.get(item_id=item_id)
        if current is None:
            return None
        now = utc_now()
        owner_filter = "AND owner_workflow_id = ?" if owner_workflow_id is not None else ""
        params: tuple[Any, ...] = (
            checked_status.value,
            now,
            json_dumps(payload if payload is not None else current.payload),
            now,
            item_id,
        )
        if owner_workflow_id is not None:
            params = (*params, owner_workflow_id)
        cursor = await self.db.execute(
            f"""
            UPDATE work_items
            SET status = ?,
                lease_expires_at = NULL,
                completed_at = ?,
                payload_json = ?,
                updated_at = ?
            WHERE id = ?
              {owner_filter}
            """,
            params,
        )
        return await self.get(item_id=item_id) if cursor.rowcount == 1 else None

    async def next_id(self) -> str:
        rows = await self.db.fetchall("SELECT id FROM work_items")
        return next_canonical_record_id(
            existing_ids=(str(row["id"]) for row in rows),
            prefix=WORK_ITEM_ID_PREFIX,
        )
