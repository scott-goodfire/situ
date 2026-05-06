from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, PrivateAttr
from pydantic_ai_backends import LocalBackend

from ...api.collections import publish_record_upsert
from ...core.db import Database
from ...core.notifications import emit_project_event
from ...core.workers import WorkerManager
from ...records.base import DbRecord
from ...repositories import Repositories

EventEmitter = Callable[
    [str, str, str | None, str | None, dict[str, Any] | None],
    dict[str, Any],
]


class SituToolDeps(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    session_id: str
    agent_id: str | None = None
    workspace_id: str | None = None
    project_id: str | None = None
    project_dir: Path | None = None
    repo_path: str | None = None
    app_root: Path | None = None
    repos: Repositories | None = Field(default=None, exclude=True)
    worker_manager: WorkerManager | None = Field(default=None, exclude=True)
    emit_event: EventEmitter | None = Field(default=None, exclude=True)

    _opened_db: Database | None = PrivateAttr(default=None)
    _opened_repos: Repositories | None = PrivateAttr(default=None)
    _workspace_backend: LocalBackend | None = PrivateAttr(default=None)

    @property
    def backend(self) -> LocalBackend:
        if self._workspace_backend is not None:
            return self._workspace_backend
        if self.repo_path is None:
            raise RuntimeError("tool deps require repo_path for workspace tools")

        repo_path = Path(self.repo_path).resolve()
        self._workspace_backend = LocalBackend(
            root_dir=repo_path,
            allowed_directories=[str(repo_path)],
            enable_execute=True,
        )
        return self._workspace_backend

    def get_repos(self) -> Repositories:
        if self.repos is not None:
            return self.repos
        if self._opened_repos is not None:
            return self._opened_repos
        resolved_workspace_id = self.workspace_id or self.project_id
        if resolved_workspace_id is None or self.project_dir is None or self.repo_path is None:
            raise RuntimeError("tool deps require repos or workspace_id/project_dir/repo_path")

        self._opened_db = Database(
            self.project_dir / "situ.sqlite",
            workspace_id=resolved_workspace_id,
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

    def require_project_id(self) -> str:
        session = self.get_repos().sessions.get(self.session_id)
        if session is None:
            raise ValueError(f"session not found: {self.session_id}")
        if session.project_id is None:
            raise ValueError(
                "current session has no project; create or attach a project first"
            )
        return session.project_id

    def current_project_id(self) -> str | None:
        if self.project_id is not None:
            return self.project_id
        session = self.get_repos().sessions.get(self.session_id)
        return session.project_id if session is not None else None

    def record_event(
        self,
        event_type: str,
        message: str,
        *,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        associated_project_id = self.current_project_id()
        if self.emit_event is None:
            event = self.get_repos().events.add(
                event_type=event_type,
                message=message,
                associated_project_id=associated_project_id,
                associated_session_id=self.session_id,
                payload=payload,
            )
            event_dump = event.model_dump()
            emit_project_event(self.workspace_id or self.project_id, event_dump)
            self.publish_record(event, cursor=event.id)
            return event_dump
        event = self.emit_event(
            event_type,
            message,
            associated_project_id,
            self.session_id,
            payload,
        )
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
            project_id=self.workspace_id or self.project_id,
            record=record,
            cursor=resolved_cursor,
        )
