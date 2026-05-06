from __future__ import annotations

from typing import Any

from pydantic import Field

from ...records import AnalysisActivityKind
from ..base.command import RepositoryCommand


class AddAnalysisActivity(RepositoryCommand):
    analysis_id: str
    created_in_session_id: str | None = None
    actor: str
    kind: AnalysisActivityKind
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
