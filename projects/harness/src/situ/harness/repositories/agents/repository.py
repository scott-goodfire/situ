from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...records import (
    AgentKind,
    AgentRecord,
    AgentStatus,
    parse_agent_kind,
    parse_agent_status,
)
from ..base import BaseRepository
from .command import CreateAgent, UpdateAgent


def _agent_row(row: Any) -> AgentRecord:
    return AgentRecord(
        id=row["id"],
        project_id=row["project_id"],
        created_in_session_id=row["created_in_session_id"],
        kind=row["kind"],
        display_name=row["display_name"],
        model_name=row["model_name"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class AgentsRepository(BaseRepository):
    def create(
        self,
        *,
        agent_id: str,
        project_id: str,
        created_in_session_id: str | None = None,
        kind: AgentKind | str,
        display_name: str,
        model_name: str | None = None,
        status: AgentStatus | str = AgentStatus.IDLE,
    ) -> AgentRecord:
        checked_kind = parse_agent_kind(kind)
        checked_status = parse_agent_status(status)
        command = CreateAgent(
            agent_id=agent_id,
            project_id=project_id,
            created_in_session_id=created_in_session_id,
            kind=checked_kind,
            display_name=display_name,
            model_name=model_name,
            status=checked_status,
        )
        now = utc_now()
        self.db.execute_blocking(
            """
            INSERT INTO agents
              (id, project_id, created_in_session_id, kind, display_name, model_name,
               status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.agent_id,
                command.project_id,
                command.created_in_session_id,
                command.kind.value,
                command.display_name,
                command.model_name,
                command.status.value,
                now,
                now,
            ),
        )
        record = self.get(agent_id=command.agent_id)
        if record is None:
            raise RuntimeError(f"agent was not persisted: {command.agent_id}")
        return record

    def ensure_project_agent(
        self,
        *,
        project_id: str,
        kind: AgentKind | str,
        display_name: str,
        model_name: str | None = None,
        created_in_session_id: str | None = None,
    ) -> AgentRecord:
        checked_kind = parse_agent_kind(kind)
        existing = self.get_for_project_kind(project_id=project_id, kind=checked_kind)
        if existing is not None:
            if model_name is not None and existing.model_name != model_name:
                return self.update(agent_id=existing.id, model_name=model_name) or existing
            return existing
        return self.create(
            agent_id=f"agent_{project_id}_{checked_kind.value}",
            project_id=project_id,
            created_in_session_id=created_in_session_id,
            kind=checked_kind,
            display_name=display_name,
            model_name=model_name,
        )

    def ensure_task_agent(
        self,
        *,
        project_id: str,
        task_id: str,
        kind: AgentKind | str,
        display_name: str,
        model_name: str | None = None,
        created_in_session_id: str | None = None,
    ) -> AgentRecord:
        checked_kind = parse_agent_kind(kind)
        agent_id = f"agent_{project_id}_{checked_kind.value}_{task_id}"
        existing = self.get(agent_id=agent_id)
        if existing is not None:
            if model_name is not None and existing.model_name != model_name:
                return self.update(agent_id=existing.id, model_name=model_name) or existing
            return existing
        return self.create(
            agent_id=agent_id,
            project_id=project_id,
            created_in_session_id=created_in_session_id,
            kind=checked_kind,
            display_name=display_name,
            model_name=model_name,
        )

    def ensure_session_agent(
        self,
        *,
        session_id: str,
        kind: AgentKind | str,
        display_name: str,
        model_name: str | None = None,
    ) -> AgentRecord:
        project_id = self._project_id_for_session(session_id)
        if project_id is None:
            raise ValueError(
                "current run has no project; create or attach a project before creating agents"
            )
        return self.ensure_project_agent(
            project_id=project_id,
            created_in_session_id=session_id,
            kind=kind,
            display_name=display_name,
            model_name=model_name,
        )

    def update(
        self,
        *,
        agent_id: str,
        display_name: str | None = None,
        model_name: str | None = None,
        status: AgentStatus | str | None = None,
    ) -> AgentRecord | None:
        checked_status = parse_agent_status(status) if status is not None else None
        command = UpdateAgent(
            agent_id=agent_id,
            display_name=display_name,
            model_name=model_name,
            status=checked_status,
        )
        current = self.get(agent_id=command.agent_id)
        if current is None:
            return None
        self.db.execute_blocking(
            """
            UPDATE agents
            SET display_name = ?, model_name = ?, status = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                command.display_name if command.display_name is not None else current.display_name,
                command.model_name if command.model_name is not None else current.model_name,
                command.status.value if command.status is not None else current.status.value,
                utc_now(),
                command.agent_id,
            ),
        )
        return self.get(agent_id=command.agent_id)

    def get(self, *, agent_id: str) -> AgentRecord | None:
        row = self.db.fetchone_blocking("SELECT * FROM agents WHERE id = ?", (agent_id,))
        return _agent_row(row) if row else None

    def get_for_project_kind(
        self,
        *,
        project_id: str,
        kind: AgentKind | str,
    ) -> AgentRecord | None:
        checked_kind = parse_agent_kind(kind)
        row = self.db.fetchone_blocking(
            """
            SELECT * FROM agents
            WHERE project_id = ? AND kind = ?
            ORDER BY created_at
            LIMIT 1
            """,
            (project_id, checked_kind.value),
        )
        return _agent_row(row) if row else None

    def get_for_session_kind(
        self,
        *,
        session_id: str,
        kind: AgentKind | str,
    ) -> AgentRecord | None:
        project_id = self._project_id_for_session(session_id)
        if project_id is None:
            return None
        return self.get_for_project_kind(project_id=project_id, kind=kind)

    def list_all(self) -> list[AgentRecord]:
        return [_agent_row(row) for row in self.db.fetchall_blocking("SELECT * FROM agents ORDER BY created_at")]

    def list_for_project(self, *, project_id: str) -> list[AgentRecord]:
        return [
            _agent_row(row)
            for row in self.db.fetchall_blocking(
                "SELECT * FROM agents WHERE project_id = ? ORDER BY created_at",
                (project_id,),
            )
        ]

    def list_for_session(self, *, session_id: str) -> list[AgentRecord]:
        project_id = self._project_id_for_session(session_id)
        return (
            self.list_for_project(project_id=project_id)
            if project_id is not None
            else []
        )

    def _project_id_for_session(self, session_id: str) -> str | None:
        row = self.db.fetchone_blocking("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        return row["project_id"] if row else None
