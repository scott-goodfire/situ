from __future__ import annotations

from pydantic import Field

from ...records.measurement import MeasurementPayload
from ..base.command import RepositoryCommand


class AddMeasurement(RepositoryCommand):
    evaluation_id: str
    created_in_session_id: str | None = None
    actor: str
    body: str
    payload: MeasurementPayload = Field(default_factory=MeasurementPayload)
