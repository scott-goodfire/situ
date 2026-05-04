from __future__ import annotations

from typing import Any

from pydantic import Field

from ..common import AlmanacToolReturn


class GetRunContextResult(AlmanacToolReturn):
    config: dict[str, Any] | None = None
    run: dict[str, Any] | None = None
    recent_experiments: list[dict[str, Any]] = Field(default_factory=list)
    recent_evidence: list[dict[str, Any]] = Field(default_factory=list)
    recent_findings: list[dict[str, Any]] = Field(default_factory=list)
    recent_warnings: list[dict[str, Any]] = Field(default_factory=list)
