from __future__ import annotations

from evals.harness.models.eval_model.model import EvalModel


class EvalWarning(EvalModel):
    kind: str
    message: str
    experiment_id: str | None = None
