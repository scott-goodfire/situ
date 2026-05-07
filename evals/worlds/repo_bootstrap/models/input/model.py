from __future__ import annotations

from typing import Literal

from evals.harness.models import EvalModel

RepoBootstrapSeed = Literal[
    "empty_repo",
    "with_baseline_no_hypothesis",
    "with_baseline_result",
]


class RepoBootstrapEvalInput(EvalModel):
    case_id: str
    seed: RepoBootstrapSeed
    objective: str = "Improve validation bits per byte while preserving comparison integrity."
    prompt: str
