from __future__ import annotations

from typing import Any

from ...core.db.serialization import agent_message_history_row, json_dumps, json_loads, utc_now
from ...records import AgentMessageHistoryRecord
from ..base import BaseRepository
from .command import AppendAgentMessageHistory


class AgentMessageHistoryRepository(BaseRepository):
    def append_session_messages(
        self,
        *,
        session_id: str,
        agent_name: str,
        messages_json: bytes | str,
        pydantic_run_id: str | None = None,
        conversation_id: str | None = None,
    ) -> AgentMessageHistoryRecord:
        normalized_json = self._normalize_messages_json(messages_json)
        messages = self._messages_from_json(normalized_json)
        inferred_run_id, inferred_conversation_id = self._infer_pydantic_ids(messages)
        command = AppendAgentMessageHistory(
            session_id=session_id,
            agent_name=agent_name,
            messages_json=normalized_json,
            pydantic_run_id=pydantic_run_id or inferred_run_id,
            conversation_id=conversation_id or inferred_conversation_id,
        )
        cursor = self.db.execute(
            """
            INSERT INTO agent_message_history
              (session_id, agent_name, pydantic_run_id, conversation_id,
               messages_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                command.session_id,
                command.agent_name,
                command.pydantic_run_id,
                command.conversation_id,
                command.messages_json,
                utc_now(),
            ),
        )
        record = self.get(int(cursor.lastrowid))
        if record is None:
            raise RuntimeError("agent message history was not persisted")
        return record

    def get_by_id(self, history_id: int) -> AgentMessageHistoryRecord | None:
        row = self.db.fetchone("SELECT * FROM agent_message_history WHERE id = ?", (history_id,))
        return agent_message_history_row(row) if row else None

    def get(self, history_id: int) -> AgentMessageHistoryRecord | None:
        return self.get_by_id(history_id)

    def list_for_session(
        self,
        session_id: str,
        *,
        agent_name: str | None = None,
    ) -> list[AgentMessageHistoryRecord]:
        if agent_name is None:
            rows = self.db.fetchall(
                "SELECT * FROM agent_message_history WHERE session_id = ? ORDER BY id",
                (session_id,),
            )
        else:
            rows = self.db.fetchall(
                """
                SELECT * FROM agent_message_history
                WHERE session_id = ? AND agent_name = ?
                ORDER BY id
                """,
                (session_id, agent_name),
            )
        return [agent_message_history_row(row) for row in rows]

    def list_all(self) -> list[AgentMessageHistoryRecord]:
        return [
            agent_message_history_row(row)
            for row in self.db.fetchall("SELECT * FROM agent_message_history ORDER BY id")
        ]

    def get_message_history(
        self,
        session_id: str,
        *,
        agent_name: str | None = None,
    ) -> list[dict[str, Any]]:
        messages: list[dict[str, Any]] = []
        for record in self.list_for_session(session_id, agent_name=agent_name):
            messages.extend(record.messages)
        return messages

    def get_message_history_json(
        self,
        session_id: str,
        *,
        agent_name: str | None = None,
    ) -> bytes:
        return json_dumps(self.get_message_history(session_id, agent_name=agent_name)).encode()

    def get_model_message_history(
        self,
        session_id: str,
        *,
        agent_name: str | None = None,
    ) -> list[Any]:
        from pydantic_ai import ModelMessagesTypeAdapter

        return list(
            ModelMessagesTypeAdapter.validate_json(
                self.get_message_history_json(session_id, agent_name=agent_name)
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
