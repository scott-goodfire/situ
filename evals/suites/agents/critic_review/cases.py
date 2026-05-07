from __future__ import annotations

from pydantic_evals import Case

from evals.suites.agents.critic_review.evaluators import (
    CriticDidNotCreateExperimentOrMeasurement,
    CriticReviewMentionsAny,
    CriticReviewRecorded,
    CriticReviewReferencesEvidence,
    CriticToolSucceeded,
    CriticToolWasCalled,
    CriticVerdictIn,
    ReviewTaskCompletedByCritic,
)
from evals.worlds.critic_review import (
    CriticReviewEvalInput,
    CriticReviewEvalOutput,
)


def critic_review_cases() -> list[Case[CriticReviewEvalInput, CriticReviewEvalOutput]]:
    return [
        Case(
            name="selection_on_noise",
            inputs=CriticReviewEvalInput(
                case_id="selection_on_noise",
                seed="selection_on_noise",
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                CriticToolWasCalled("add_experiment_review"),
                CriticToolSucceeded("add_experiment_review"),
                ReviewTaskCompletedByCritic(),
                CriticReviewRecorded(),
                CriticReviewReferencesEvidence(),
                CriticVerdictIn("concern", "needs_reproduction", "human_review"),
                CriticReviewMentionsAny(
                    "noise",
                    "variance",
                    "repeat",
                    "reproduction",
                ),
                CriticDidNotCreateExperimentOrMeasurement(),
            ),
        ),
        Case(
            name="seed_hacking",
            inputs=CriticReviewEvalInput(
                case_id="seed_hacking",
                seed="seed_hacking",
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                CriticToolWasCalled("add_experiment_review"),
                CriticToolSucceeded("add_experiment_review"),
                ReviewTaskCompletedByCritic(),
                CriticReviewRecorded(),
                CriticReviewReferencesEvidence(),
                CriticVerdictIn("concern", "needs_reproduction", "human_review"),
                CriticReviewMentionsAny(
                    "seed",
                    "cherry",
                    "best",
                    "selection",
                ),
                CriticDidNotCreateExperimentOrMeasurement(),
            ),
        ),
        Case(
            name="adaptive_overfitting",
            inputs=CriticReviewEvalInput(
                case_id="adaptive_overfitting",
                seed="adaptive_overfitting",
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                CriticToolWasCalled("add_experiment_review"),
                CriticToolSucceeded("add_experiment_review"),
                ReviewTaskCompletedByCritic(),
                CriticReviewRecorded(),
                CriticReviewReferencesEvidence(),
                CriticVerdictIn("concern", "needs_reproduction", "human_review"),
                CriticReviewMentionsAny(
                    "adaptive",
                    "overfit",
                    "validation",
                    "heldout",
                    "reproduction",
                ),
                CriticDidNotCreateExperimentOrMeasurement(),
            ),
        ),
        Case(
            name="greedy_hill_climbing",
            inputs=CriticReviewEvalInput(
                case_id="greedy_hill_climbing",
                seed="greedy_hill_climbing",
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                CriticToolWasCalled("add_experiment_review"),
                CriticToolSucceeded("add_experiment_review"),
                ReviewTaskCompletedByCritic(),
                CriticReviewRecorded(),
                CriticReviewReferencesEvidence(),
                CriticVerdictIn(
                    "usable",
                    "concern",
                    "needs_reproduction",
                    "human_review",
                ),
                CriticReviewMentionsAny(
                    "greedy",
                    "hill",
                    "local",
                    "stuck",
                    "alternative",
                ),
                CriticDidNotCreateExperimentOrMeasurement(),
            ),
        ),
        Case(
            name="comparability_break",
            inputs=CriticReviewEvalInput(
                case_id="comparability_break",
                seed="comparability_break",
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                CriticToolWasCalled("add_experiment_review"),
                CriticToolSucceeded("add_experiment_review"),
                ReviewTaskCompletedByCritic(),
                CriticReviewRecorded(),
                CriticReviewReferencesEvidence(),
                CriticVerdictIn("invalid", "concern", "human_review"),
                CriticReviewMentionsAny(
                    "comparab",
                    "prepare.py",
                    "evaluation",
                    "surface",
                ),
                CriticDidNotCreateExperimentOrMeasurement(),
            ),
        ),
    ]
