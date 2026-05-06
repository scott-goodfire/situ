from __future__ import annotations

from typing import Literal

from evals.harness.models import EvalModel

AppSessionLoopSeed = Literal[
    "empty_repo",
    "with_baseline_result",
]


class AppSessionLoopEvalInput(EvalModel):
    case_id: str
    seed: AppSessionLoopSeed
    max_experiments: int = 1
    objective: str = "Improve validation bits per byte while preserving comparison integrity."
    research_context: str = (
        "Use the project-native measurement command, preserve raw command "
        "output as evidence, avoid changing setup/evaluation code, and after "
        "baseline evidence exists try component_a by changing only train.py."
    )
