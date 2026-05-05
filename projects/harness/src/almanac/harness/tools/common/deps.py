from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, PrivateAttr

from ...api.collections import publish_record_upsert
from ...core.db import Database
from ...core.notifications import emit_project_event
from ...core.workers import WorkerManager
from ...records.base import DbRecord
from ...repositories import Repositories

EventEmitter = Callable[[str, str, str | None, dict[str, Any] | None], dict[str, Any]]


class AlmanacToolDeps(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    session_id: str
    project_id: str | None = None
    project_dir: Path | None = None
    repo_path: str | None = None
    app_root: Path | None = None
    repos: Repositories | None = Field(default=None, exclude=True)
    worker_manager: WorkerManager | None = Field(default=None, exclude=True)
    emit_event: EventEmitter | None = Field(default=None, exclude=True)

    _opened_db: Database | None = PrivateAttr(default=None)
    _opened_repos: Repositories | None = PrivateAttr(default=None)

    def get_repos(self) -> Repositories:
        if self.repos is not None:
            return self.repos
        if self._opened_repos is not None:
            return self._opened_repos
        if self.project_id is None or self.project_dir is None or self.repo_path is None:
            raise RuntimeError("tool deps require repos or project_id/project_dir/repo_path")

        self._opened_db = Database(
            self.project_dir / "almanac.sqlite",
            project_id=self.project_id,
            repo_path=self.repo_path,
        )
        self._opened_repos = Repositories.create(self._opened_db)
        return self._opened_repos

    def get_worker_manager(self) -> WorkerManager:
        if self.worker_manager is not None:
            return self.worker_manager
        if self.repo_path is None:
            raise RuntimeError("tool deps require worker_manager or repo_path")
        return WorkerManager(Path(self.repo_path), app_root=self.app_root)

    def record_event(
        self,
        event_type: str,
        message: str,
        *,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        if self.emit_event is None:
            event = self.get_repos().events.add(
                event_type=event_type,
                message=message,
                session_id=self.session_id,
                payload=payload,
            )
            event_dump = event.model_dump()
            emit_project_event(self.project_id, event_dump)
            self.publish_record(event, cursor=event.id)
            return event_dump
        event = self.emit_event(event_type, message, self.session_id, payload)
        event_id = event.get("id") if event is not None else None
        return event

    def publish_record(
        self,
        record: DbRecord,
        *,
        event: dict[str, Any] | None = None,
        cursor: int | None = None,
    ) -> None:
        resolved_cursor = cursor
        if resolved_cursor is None and event is not None:
            event_id = event.get("id")
            resolved_cursor = event_id if isinstance(event_id, int) else None
        publish_record_upsert(
            project_id=self.project_id,
            record=record,
            cursor=resolved_cursor,
        )
