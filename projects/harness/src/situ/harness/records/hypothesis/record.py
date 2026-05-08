from __future__ import annotations

from enum import StrEnum

from ..base import DbRecord
from ..experiment.record import RecordStatus


class HypothesisResolution(StrEnum):
    SUPPORTED = "supported"
    REJECTED = "rejected"
    SUPERSEDED = "superseded"
    INCONCLUSIVE = "inconclusive"


def parse_hypothesis_resolution(
    resolution: HypothesisResolution | str,
) -> HypothesisResolution:
    try:
        return HypothesisResolution(resolution)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in HypothesisResolution)
        raise ValueError(
            f"invalid hypothesis resolution: {resolution!r}. "
            f"Use exactly one of {allowed}."
        ) from error


class HypothesisRecord(DbRecord):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    title: str
    summary: str
    status: RecordStatus
    created_at: str
    updated_at: str
