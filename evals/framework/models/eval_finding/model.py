from __future__ import annotations

from pydantic import Field

from evals.framework.models.eval_model.model import EvalModel


class EvalFinding(EvalModel):
    content: str
    evidence_ids: list[str] = Field(default_factory=list)
