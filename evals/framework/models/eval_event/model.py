from __future__ import annotations

from typing import Any

from pydantic import Field

from evals.framework.models.eval_model.model import EvalModel


class EvalEvent(EvalModel):
    event_type: str
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
