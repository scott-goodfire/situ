from __future__ import annotations

import os
from typing import Any

from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...records import AgentMessageHistoryRecord
from ..base import BaseRepository
from .command import AppendAgentMessageHistory


def _resolve_history_cap() -> int:
    raw = os.environ.get("SITU_AGENT_HISTORY_CAP")
    if raw is None:
        return 2
    try:
        value = int(raw)
    except ValueError:
        return 2
    return max(0, value)


AGENT_HISTORY_RECORD_CAP = _resolve_history_cap()


def _agent_message_history_row(row: Any) -> AgentMessageHistoryRecord:
    return AgentMessageHistoryRecord(
        id=row["id"],
        project_id=row["project_id"],
        created_in_session_id=row["created_in_session_id"],
        agent_id=row["agent_id"] if "agent_id" in row.keys() else None,
        agent_name=row["agent_name"],
        pydantic_run_id=row["pydantic_run_id"],
        conversation_id=row["conversation_id"],
        messages=json_loads(row["messages_json"]),
        created_at=row["created_at"],
    )


class AgentMessageHistoryRepository(BaseRepository):
    async def append_project_messages(
        self,
        *,
        project_id: str,
        created_in_session_id: str | None = None,
        agent_id: str | None = None,
        agent_name: str,
        messages_json: bytes | str,
        pydantic_run_id: str | None = None,
        conversation_id: str | None = None,
    ) -> AgentMessageHistoryRecord:
        normalized_json = self._normalize_messages_json(messages_json)
        messages = self._messages_from_json(normalized_json)
        inferred_run_id, inferred_conversation_id = self._infer_pydantic_ids(messages)
        command = AppendAgentMessageHistory(
            project_id=project_id,
            created_in_session_id=created_in_session_id,
            agent_id=agent_id,
            agent_name=agent_name,
            messages_json=normalized_json,
            pydantic_run_id=pydantic_run_id or inferred_run_id,
            conversation_id=conversation_id or inferred_conversation_id,
        )
        cursor = await self.db.execute(
            """
            INSERT INTO agent_message_history
              (project_id, created_in_session_id, agent_id, agent_name,
               pydantic_run_id, conversation_id, messages_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.project_id,
                command.created_in_session_id,
                command.agent_id,
                command.agent_name,
                command.pydantic_run_id,
                command.conversation_id,
                command.messages_json,
                utc_now(),
            ),
        )
        record = await self.get(history_id=int(cursor.lastrowid))
        if record is None:
            raise RuntimeError("agent message history was not persisted")
        return record

    async def append_session_messages(
        self,
        *,
        session_id: str,
        agent_id: str | None = None,
        agent_name: str,
        messages_json: bytes | str,
        pydantic_run_id: str | None = None,
        conversation_id: str | None = None,
    ) -> AgentMessageHistoryRecord:
        project_id = await self._project_id_for_session(session_id)
        if project_id is None:
            raise ValueError(
                "current run has no project; create or attach a project before recording agent messages"
            )
        return await self.append_project_messages(
            project_id=project_id,
            created_in_session_id=session_id,
            agent_id=agent_id,
            agent_name=agent_name,
            messages_json=messages_json,
            pydantic_run_id=pydantic_run_id,
            conversation_id=conversation_id,
        )

    async def get_by_id(self, *, history_id: int) -> AgentMessageHistoryRecord | None:
        row = await self.db.fetchone("SELECT * FROM agent_message_history WHERE id = ?", (history_id,))
        return _agent_message_history_row(row) if row else None

    async def get(self, *, history_id: int) -> AgentMessageHistoryRecord | None:
        return await self.get_by_id(history_id=history_id)

    async def list_for_project(
        self,
        *,
        project_id: str,
        agent_id: str | None = None,
        agent_name: str | None = None,
    ) -> list[AgentMessageHistoryRecord]:
        if agent_id is None and agent_name is None:
            rows = await self.db.fetchall(
                "SELECT * FROM agent_message_history WHERE project_id = ? ORDER BY id",
                (project_id,),
            )
        elif agent_id is not None and agent_name is not None:
            rows = await self.db.fetchall(
                """
                SELECT * FROM agent_message_history
                WHERE project_id = ? AND agent_id = ? AND agent_name = ?
                ORDER BY id
                """,
                (project_id, agent_id, agent_name),
            )
        elif agent_id is not None:
            rows = await self.db.fetchall(
                """
                SELECT * FROM agent_message_history
                WHERE project_id = ? AND agent_id = ?
                ORDER BY id
                """,
                (project_id, agent_id),
            )
        else:
            rows = await self.db.fetchall(
                """
                SELECT * FROM agent_message_history
                WHERE project_id = ? AND agent_name = ?
                ORDER BY id
                """,
                (project_id, agent_name),
            )
        return [_agent_message_history_row(row) for row in rows]

    async def list_for_session(
        self,
        *,
        session_id: str,
        agent_id: str | None = None,
        agent_name: str | None = None,
    ) -> list[AgentMessageHistoryRecord]:
        project_id = await self._project_id_for_session(session_id)
        if project_id is None:
            return []
        return await self.list_for_project(
            project_id=project_id,
            agent_id=agent_id,
            agent_name=agent_name,
        )

    async def list_all(self) -> list[AgentMessageHistoryRecord]:
        return [
            _agent_message_history_row(row)
            for row in await self.db.fetchall("SELECT * FROM agent_message_history ORDER BY id")
        ]

    async def get_message_history(
        self,
        *,
        project_or_session_id: str,
        agent_id: str | None = None,
        agent_name: str | None = None,
        record_cap: int | None = AGENT_HISTORY_RECORD_CAP,
    ) -> list[dict[str, Any]]:
        project_id = await self._resolve_project_id(project_or_session_id)
        if project_id is None:
            return []
        if record_cap == 0:
            return []
        records = await self.list_for_project(
            project_id=project_id,
            agent_id=agent_id,
            agent_name=agent_name,
        )
        # Cap retrieved history to the last N records per agent. Each record
        # is one self-contained agent.run output; agents re-read project
        # state via tools every pass, so older raw history mostly duplicates
        # information the agent will fetch fresh anyway. Without this cap,
        # message history grows unbounded and exceeds the model's context
        # window after a few dozen passes. Set SITU_AGENT_HISTORY_CAP=0 to
        # disable replay entirely — the agent then runs each pass cold but
        # picks up project state via tool reads, which is sufficient when
        # individual passes fetch large project_overview responses. Pass
        # record_cap=None for a long-lived compacted agent transcript.
        if record_cap is not None and len(records) > record_cap:
            records = records[-record_cap:]
        messages: list[dict[str, Any]] = []
        for record in records:
            messages.extend(record.messages)
        return messages

    async def get_message_history_json(
        self,
        *,
        project_or_session_id: str,
        agent_id: str | None = None,
        agent_name: str | None = None,
        record_cap: int | None = AGENT_HISTORY_RECORD_CAP,
    ) -> bytes:
        return json_dumps(
            await self.get_message_history(
                project_or_session_id=project_or_session_id,
                agent_id=agent_id,
                agent_name=agent_name,
                record_cap=record_cap,
            )
        ).encode()

    async def get_model_message_history(
        self,
        *,
        project_or_session_id: str,
        agent_id: str | None = None,
        agent_name: str | None = None,
        record_cap: int | None = AGENT_HISTORY_RECORD_CAP,
    ) -> list[Any]:
        from pydantic_ai import ModelMessagesTypeAdapter

        return list(
            ModelMessagesTypeAdapter.validate_json(
                await self.get_message_history_json(
                    project_or_session_id=project_or_session_id,
                    agent_id=agent_id,
                    agent_name=agent_name,
                    record_cap=record_cap,
                )
            )
        )

    @staticmethod
    def _normalize_messages_json(messages_json: bytes | str) -> str:
        if isinstance(messages_json, bytes):
            return messages_json.decode()
        return messages_json

    @staticmethod
    def _messages_from_json(messages_json: str) -> list[dict[str, Any]]:
        messages = json_loads(messages_json)
        if not isinstance(messages, list):
            raise ValueError("messages_json must encode a list of Pydantic AI messages")
        if not all(isinstance(message, dict) for message in messages):
            raise ValueError("messages_json must encode objects")
        return messages

    @staticmethod
    def _infer_pydantic_ids(messages: list[dict[str, Any]]) -> tuple[str | None, str | None]:
        pydantic_run_id = None
        conversation_id = None
        for message in reversed(messages):
            if pydantic_run_id is None and isinstance(message.get("run_id"), str):
                pydantic_run_id = message["run_id"]
            if conversation_id is None and isinstance(message.get("conversation_id"), str):
                conversation_id = message["conversation_id"]
            if pydantic_run_id is not None and conversation_id is not None:
                break
        return pydantic_run_id, conversation_id

    async def _resolve_project_id(self, project_or_session_id: str) -> str | None:
        if await self.db.fetchone("SELECT 1 FROM projects WHERE id = ?", (project_or_session_id,)):
            return project_or_session_id
        return await self._project_id_for_session(project_or_session_id)

    async def _project_id_for_session(self, session_id: str) -> str | None:
        row = await self.db.fetchone("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        return row["project_id"] if row else None
