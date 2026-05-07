from __future__ import annotations

import json
import re
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
from .backend import SituLocalBackend, command_artifact_dir_for

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
    database_path: Path | None = None
    repo_path: str | None = None
    active_task_id: str | None = None
    active_experiment_id: str | None = None
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
        self._workspace_backend = SituLocalBackend(
            root_dir=repo_path,
            allowed_directories=[str(repo_path)],
            enable_execute=True,
            command_artifact_dir=command_artifact_dir_for(
                project_dir=self.project_dir,
                session_id=self.session_id,
                agent_id=self.agent_id,
                active_task_id=self.active_task_id,
                active_experiment_id=self.active_experiment_id,
            ),
            command_receipt_recorder=self.record_command_receipt,
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
            self.database_path or self.project_dir / "situ.sqlite",
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
        session = self.get_repos().sessions.get(session_id=self.session_id)
        if session is None:
            raise ValueError(f"session not found: {self.session_id}")
        if session.project_id is None:
            raise ValueError(
                "current run has no project; create or attach a project first"
            )
        return session.project_id

    def current_project_id(self) -> str | None:
        if self.project_id is not None:
            return self.project_id
        session = self.get_repos().sessions.get(session_id=self.session_id)
        return session.project_id if session is not None else None

    def record_event(
        self,
        *,
        event_type: str,
        message: str,
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
            emit_project_event(project_id=self.workspace_id or self.project_id, event=event_dump)
            self.publish_record(record=event, cursor=event.id)
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
        *,
        record: DbRecord,
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

    def record_command_receipt(
        self,
        *,
        command: str,
        rewritten_command: str,
        cwd: str,
        timeout: int | None,
        output: str,
        exit_code: int,
        truncated: bool,
        command_artifact_dir: str,
        run_log_path: str,
    ) -> None:
        project_id = self.current_project_id()
        if project_id is None or self.project_dir is None:
            return

        repos = self.get_repos()
        artifact_id = repos.artifacts.next_id(project_id=project_id)
        owner = self.active_experiment_id or self.active_task_id or self.agent_id or "unscoped"
        receipt_dir = (
            self.project_dir
            / "artifacts"
            / "commands"
            / self.session_id
            / owner
        )
        receipt_dir.mkdir(parents=True, exist_ok=True)
        receipt_path = receipt_dir / f"{artifact_id}-command-receipt.json"
        receipt = {
            "receipt_type": "command",
            "command": command,
            "rewritten_command": (
                rewritten_command if rewritten_command != command else None
            ),
            "cwd": cwd,
            "timeout_seconds": timeout,
            "exit_code": exit_code,
            "truncated": truncated,
            "output_summary": _summarize_output(output),
            "output": output,
            "metrics": _metric_hints_from_output(output),
            "runtime_paths": {
                "artifact_dir": command_artifact_dir,
                "run_log": run_log_path,
            },
            "git": _git_state_for_receipt(Path(cwd)),
        }
        receipt_path.write_text(
            json.dumps(receipt, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

        associated_entity_kind = "session"
        associated_entity_id = self.session_id
        if self.active_task_id is not None:
            associated_entity_kind = "task"
            associated_entity_id = self.active_task_id
        if self.active_experiment_id is not None:
            associated_entity_kind = "experiment"
            associated_entity_id = self.active_experiment_id

        artifact = repos.artifacts.create(
            artifact_id=artifact_id,
            project_id=project_id,
            created_in_session_id=self.session_id,
            associated_entity_kind=associated_entity_kind,
            associated_entity_id=associated_entity_id,
            kind="command_receipt",
            title=_command_receipt_title(command),
            path=_artifact_path_for_record(
                artifact_path=receipt_path,
                project_dir=self.project_dir,
            ),
            media_type="application/json",
            size_bytes=receipt_path.stat().st_size,
        )
        if self.active_task_id is not None:
            link = repos.task_entity_links.create(
                project_id=project_id,
                task_id=self.active_task_id,
                entity_kind="artifact",
                entity_id=artifact.id,
                relationship="receipt",
            )
        else:
            link = None
        event = self.record_event(
            event_type="artifact.command_receipt_created",
            message=f"Captured command receipt {artifact.id}",
            payload={
                "artifact_id": artifact.id,
                "command": command,
                "exit_code": exit_code,
                "associated_entity_kind": associated_entity_kind,
                "associated_entity_id": associated_entity_id,
            },
        )
        self.publish_record(record=artifact, event=event)
        if link is not None:
            self.publish_record(record=link, event=event)


_METRIC_LINE_RE = re.compile(
    r"(?m)^\s*([A-Za-z_][\w.-]{0,63})\s*[:=]\s*(-?\d+(?:\.\d+)?)\b"
)


def _summarize_output(output: str, *, max_characters: int = 1200) -> str:
    text = output.strip()
    if len(text) <= max_characters:
        return text
    head = text[: max_characters // 2].rstrip()
    tail = text[-max_characters // 2 :].lstrip()
    return f"{head}\n...\n{tail}"


def _metric_hints_from_output(output: str) -> dict[str, dict[str, Any]]:
    metrics: dict[str, dict[str, Any]] = {}
    for match in _METRIC_LINE_RE.finditer(output):
        key = match.group(1)
        raw_value = match.group(2)
        value: int | float
        value = float(raw_value) if "." in raw_value else int(raw_value)
        metrics[key] = {
            "value": value,
            "source": "stdout_heuristic",
        }
        if len(metrics) >= 20:
            break
    return metrics


def _git_state_for_receipt(cwd: Path) -> dict[str, Any]:
    git_root = _git_text(cwd, "rev-parse", "--show-toplevel")
    if not git_root:
        return {"available": False}
    return {
        "available": True,
        "root": git_root,
        "branch": _git_text(cwd, "branch", "--show-current") or None,
        "commit": _git_text(cwd, "rev-parse", "HEAD") or None,
        "dirty": bool(_git_lines(cwd, "status", "--porcelain=v1", "--untracked-files=all")),
    }


def _git_text(cwd: Path, *args: str) -> str:
    import subprocess

    result = subprocess.run(
        ["git", *args],
        cwd=cwd,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else ""


def _git_lines(cwd: Path, *args: str) -> list[str]:
    text = _git_text(cwd, *args)
    return text.splitlines() if text else []


def _artifact_path_for_record(*, artifact_path: Path, project_dir: Path) -> str:
    try:
        return str(artifact_path.relative_to(project_dir))
    except ValueError:
        return str(artifact_path)


def _command_receipt_title(command: str) -> str:
    normalized = " ".join(command.split())
    if len(normalized) <= 64:
        return f"Command receipt: {normalized}"
    return f"Command receipt: {normalized[:61]}..."
