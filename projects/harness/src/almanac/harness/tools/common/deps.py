from __future__ import annotations

from collections.abc import Callable
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from ...db import Repositories
from ...worker_manager import WorkerManager

EventEmitter = Callable[[str, str, str | None, dict[str, Any] | None], dict[str, Any]]


class AlmanacToolDeps(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    run_id: str
    repos: Repositories
    worker_manager: WorkerManager | None = None
    emit_event: EventEmitter | None = Field(default=None, exclude=True)

    def record_event(
        self,
        event_type: str,
        message: str,
        *,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        if self.emit_event is None:
            return None
        return self.emit_event(event_type, message, self.run_id, payload)
