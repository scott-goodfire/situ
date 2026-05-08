from __future__ import annotations

from typing import Any

from ...api.collections import publish_record_upsert
from ...records import EventRecord
from ...records.base import DbRecord
from ...repositories import Repositories
from ..notifications import emit_project_event


async def record_event(
    repos: Repositories,
    *,
    event_type: str,
    message: str,
    project_id: str | None = None,
    session_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> EventRecord:
    event = await repos.events.add(
        event_type=event_type,
        message=message,
        associated_project_id=project_id,
        associated_session_id=session_id,
        payload=payload,
    )
    await emit_project_event(project_id=project_id, event=event.model_dump())
    await publish_record_upsert(
        project_id=project_id,
        record=event,
        cursor=event.id,
        repos=repos,
        scope_id=getattr(repos.db, "workspace_id", None) or project_id,
    )
    return event


async def publish_record(
    *,
    repos: Repositories,
    project_id: str,
    record: DbRecord,
    cursor: int,
) -> None:
    await publish_record_upsert(
        project_id=project_id,
        record=record,
        cursor=cursor,
        repos=repos,
        scope_id=getattr(repos.db, "workspace_id", None) or project_id,
    )
