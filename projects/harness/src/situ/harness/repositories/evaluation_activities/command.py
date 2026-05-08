from __future__ import annotations

from typing import Any

from pydantic import Field

from ...records import EvaluationActivityKind
from ..base.command import RepositoryCommand


class AddEvaluationActivity(RepositoryCommand):
    evaluation_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: EvaluationActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
