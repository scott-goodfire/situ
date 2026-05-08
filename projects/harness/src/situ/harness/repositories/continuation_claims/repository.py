from __future__ import annotations

from typing import Any

from ...core.db.serialization import json_dumps, utc_now
from ..base import BaseRepository


class ContinuationClaimsRepository(BaseRepository):
    async def try_claim(
        self,
        *,
        claim_key: str,
        project_id: str,
        session_id: str | None,
        kind: str,
        payload: dict[str, Any] | None = None,
    ) -> bool:
        cursor = await self.db.execute(
            """
            INSERT OR IGNORE INTO continuation_claims
              (claim_key, project_id, session_id, kind, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                claim_key,
                project_id,
                session_id,
                kind,
                json_dumps(payload or {}),
                utc_now(),
            ),
        )
        return cursor.rowcount == 1
