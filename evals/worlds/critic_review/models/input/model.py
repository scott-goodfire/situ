from __future__ import annotations

from typing import Literal

from evals.harness.models import EvalModel

CriticReviewSeed = Literal[
    "selection_on_noise",
    "seed_hacking",
    "adaptive_overfitting",
    "greedy_hill_climbing",
    "comparability_break",
]


class CriticReviewEvalInput(EvalModel):
    case_id: str
    seed: CriticReviewSeed
    objective: str = (
        "Improve validation bits per byte while preserving comparison integrity."
    )
    research_context: str = (
        "Use project-native measurements as plaintext evidence. Lower val_bpb "
        "is better, but results are decision-grade only when seed policy, "
        "repeated measurements, and evaluation surface remain comparable."
    )
