from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from ..base import DbRecord


class ComputeTargetKind(StrEnum):
    LOCAL = "local"


class ComputeTargetStatus(StrEnum):
    IDLE = "idle"
    CLAIMED = "claimed"
    DRAINING = "draining"
    DEAD = "dead"


def parse_compute_target_kind(kind: ComputeTargetKind | str) -> ComputeTargetKind:
    try:
        return ComputeTargetKind(kind)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in ComputeTargetKind)
        raise ValueError(
            f"invalid compute target kind: {kind!r}. Use exactly one of {allowed}."
        ) from error


def parse_compute_target_status(
    status: ComputeTargetStatus | str,
) -> ComputeTargetStatus:
    try:
        return ComputeTargetStatus(status)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in ComputeTargetStatus)
        raise ValueError(
            f"invalid compute target status: {status!r}. Use exactly one of {allowed}."
        ) from error


class ComputeTargetRecord(DbRecord):
    id: str
    pool: str
    kind: ComputeTargetKind
    label: str | None = None
    status: ComputeTargetStatus
    claimed_by_task_id: str | None = None
    claimed_at: str | None = None
    last_heartbeat: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str
