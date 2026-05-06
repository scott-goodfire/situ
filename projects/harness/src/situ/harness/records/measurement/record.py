from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from ..base import DbRecord

MetricDirection = Literal[
    "higher_is_better",
    "lower_is_better",
    "target",
    "informational",
]
MetricScalar = bool | int | float | str


class MetricValue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: MetricScalar
    unit: str | None = None
    direction: MetricDirection = "informational"
    notes: str | None = None


class MeasurementPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    activity_type: str | None = None
    measurement_type: str | None = None
    summary: str | None = None
    command: str | None = None
    workspace_state: dict[str, Any] | None = None
    metrics: dict[str, MetricValue] = Field(default_factory=dict)
    raw_output_summary: str | None = None
    artifact_ids: list[str] = Field(default_factory=list)
    concerns: list[dict[str, Any]] = Field(default_factory=list)
    comparison_baseline_id: str | None = None
    comparison_measurement_id: int | None = None
    comparison_metric_deltas: dict[str, MetricValue] = Field(default_factory=dict)

    @field_validator("metrics", "comparison_metric_deltas", mode="before")
    @classmethod
    def normalize_metric_map(cls, value: Any) -> Any:
        if value is None:
            return {}
        if not isinstance(value, dict):
            return value
        return {
            key: metric
            if isinstance(metric, (MetricValue, dict))
            else {"value": metric}
            for key, metric in value.items()
        }

    def to_storage_dict(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True, exclude_defaults=True)

    def get(self, key: str, default: Any = None) -> Any:
        return self.to_storage_dict().get(key, default)


class MeasurementRecord(DbRecord):
    id: int
    evaluation_id: str
    created_in_session_id: str | None = None
    actor: str
    body: str
    payload: MeasurementPayload = Field(default_factory=MeasurementPayload)
    created_at: str

    @field_serializer("payload")
    def serialize_payload(self, payload: MeasurementPayload) -> dict[str, Any]:
        return payload.to_storage_dict()
