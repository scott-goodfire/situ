from __future__ import annotations

from typing import Literal

from pydantic import ConfigDict

from evals.harness.models import EvalModel

RepoBootstrapSeed = Literal[
    "empty_repo",
    "with_baseline_result",
]


class RepoBootstrapEvalInput(EvalModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    seed: RepoBootstrapSeed
    objective: str = "Improve validation bits per byte while preserving comparison integrity."
    prompt: str
