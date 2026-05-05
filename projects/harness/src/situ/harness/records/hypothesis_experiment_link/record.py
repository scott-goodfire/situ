from __future__ import annotations

from ..base import DbRecord


class HypothesisExperimentLinkRecord(DbRecord):
    hypothesis_id: str
    experiment_id: str
    created_at: str
