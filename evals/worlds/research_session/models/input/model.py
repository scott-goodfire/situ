from __future__ import annotations

from typing import Literal

from pydantic import ConfigDict

from evals.harness.models import EvalModel

ResearchSessionSeed = Literal[
    "basic",
    "projectless",
    "with_hypothesis",
    "with_experiment",
    "with_link",
    "with_comments",
    "with_artifact",
    "with_dirty_workspace",
    "needs_baseline",
    "with_baseline_result",
    "with_promising_results",
]


class ResearchToolEvalInput(EvalModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    seed: ResearchSessionSeed
    prompt: str


class ResearchAgentEvalInput(EvalModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    seed: ResearchSessionSeed
    objective: str = "Improve validation score without worsening latency."
    prompt: str
