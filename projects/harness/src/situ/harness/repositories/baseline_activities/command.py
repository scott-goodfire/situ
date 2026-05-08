from __future__ import annotations

from typing import Any

from pydantic import Field

from ...records import BaselineActivityKind
from ..base.command import RepositoryCommand


class AddBaselineActivity(RepositoryCommand):
    baseline_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: BaselineActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
