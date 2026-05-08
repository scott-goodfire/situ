from __future__ import annotations

from typing import Any

from pydantic import Field

from ...records import HypothesisActivityKind
from ..base.command import RepositoryCommand


class AddHypothesisActivity(RepositoryCommand):
    hypothesis_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: HypothesisActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
