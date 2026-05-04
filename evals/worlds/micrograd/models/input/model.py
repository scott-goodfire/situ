from __future__ import annotations

from pydantic import ConfigDict, Field

from evals.harness.models import EvalModel
from evals.worlds.micrograd.models.scenario import Scenario


class MicrogradEvalInput(EvalModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    scenario: Scenario
    state: str
    expected_signals: list[str] = Field(
        default_factory=lambda: ["score", "accuracy", "loss", "runtime_ms", "tests_passed"]
    )
