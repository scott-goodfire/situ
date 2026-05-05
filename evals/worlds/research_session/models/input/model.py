from __future__ import annotations

from typing import Literal

from pydantic import ConfigDict

from evals.harness.models import EvalModel

ResearchSessionSeed = Literal[
    "basic",
    "with_hypothesis",
    "with_experiment",
    "with_link",
    "with_comments",
    "with_artifact",
]


class ResearchToolEvalInput(EvalModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    seed: ResearchSessionSeed
    prompt: str
