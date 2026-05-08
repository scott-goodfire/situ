from __future__ import annotations

from typing import Literal

from evals.framework.models import EvalModel

CriticFollowupSeed = Literal[
    "needs_reproduction",
    "invalid",
    "human_review",
    "usable",
]


class CriticFollowupEvalInput(EvalModel):
    case_id: str = ""
    seed: CriticFollowupSeed
    objective: str = (
        "Improve validation bits per byte while preserving comparison integrity."
    )
    research_context: str = (
        "Use the Critic's experiment review as a gate on proposed changes. "
        "Do not accept suspicious evidence as an improvement; create the next "
        "task that follows from the review verdict."
    )
