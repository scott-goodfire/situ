from __future__ import annotations

from typing import Any

from situ.harness.api.project_board import ProjectBoardService
from situ.harness.records import TaskEntityKind, TaskKind
from situ.harness.repositories import Repositories

from evals.framework.models import EvalEvent
from evals.worlds.critic_review.models import CriticReviewSeed
from evals.worlds.repo_bootstrap.world.world import (
    BASELINE_EVALUATION_ID,
    BASELINE_ID,
    PROJECT_ID,
    SESSION_ID,
    WORKSPACE_ID,
    RepoBootstrapWorld,
)

CRITIC_AGENT_ID = f"agent_{PROJECT_ID}_critic"
CANDIDATE_EXPERIMENT_ID = "EX1"
CANDIDATE_EVALUATION_ID = "EV2"


class CriticReviewWorld:
    def __init__(self, *, seed: CriticReviewSeed) -> None:
        self._repo_world = RepoBootstrapWorld(seed="with_baseline_result")
        self.seed = seed
        self.repos.agents.ensure_project_agent(
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            kind="critic",
            display_name="Critic",
            model_name="eval:model",
        )
        self.review_task_id = self._seed_review_case(seed)

    @property
    def repos(self) -> Repositories:
        return self._repo_world.repos

    @property
    def events(self) -> list[EvalEvent]:
        return self._repo_world.events

    @property
    def workspace_path(self):
        return self._repo_world.workspace_path

    def teardown(self) -> None:
        self._repo_world.teardown()

    def emit_event(
        self,
        event_type: str,
        message: str,
        associated_project_id: str | None,
        associated_session_id: str | None,
        payload: dict[str, Any] | None,
    ) -> dict[str, Any]:
        return self._repo_world.emit_event(
            event_type,
            message,
            associated_project_id,
            associated_session_id,
            payload,
        )

    async def project_board(self) -> dict[str, Any]:
        return (
            await ProjectBoardService(repos=self.repos).get_project_board(
                session_id=SESSION_ID
            )
        ).model_dump(mode="json")

    def workspace_files(self) -> dict[str, str]:
        return self._repo_world.workspace_files()

    def changed_files(self) -> list[str]:
        return self._repo_world.changed_files()

    def _seed_review_case(self, seed: CriticReviewSeed) -> str:
        baseline_measurement_ids = _add_baseline_context(self.repos, seed)
        experiment = self.repos.experiments.create(
            experiment_id=CANDIDATE_EXPERIMENT_ID,
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title=_experiment_title(seed),
            summary=_experiment_summary(seed),
            status="closed",
            worktree_path=str(self.workspace_path),
            base_commit="eval-fixture-base",
        )
        evaluation = self.repos.evaluations.create(
            evaluation_id=CANDIDATE_EVALUATION_ID,
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title=_evaluation_title(seed),
            summary=_evaluation_summary(seed),
            associated_experiment_id=experiment.id,
            status="closed",
        )
        candidate_measurement_ids = _add_candidate_measurements(self.repos, seed)
        self.repos.experiment_activities.add(
            experiment_id=experiment.id,
            created_in_session_id=SESSION_ID,
            actor="harness",
            kind="comment",
            body=_workspace_state_body(seed),
            payload={
                "activity_type": "workspace_state",
                "base_commit": "eval-fixture-base",
                "worktree": _workspace_state_payload(seed),
            },
        )
        self.repos.experiment_activities.add(
            experiment_id=experiment.id,
            created_in_session_id=SESSION_ID,
            actor="scientist",
            kind="comment",
            body=_scientist_interpretation(seed),
            payload={"activity_type": "interpretation"},
        )
        task = self.repos.tasks.create(
            task_id=self.repos.tasks.next_id(project_id=PROJECT_ID),
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title=_review_task_title(seed),
            content=_review_task_content(
                seed,
                candidate_measurement_ids=candidate_measurement_ids,
                baseline_measurement_ids=baseline_measurement_ids,
            ),
            kind=TaskKind.REVIEW,
            priority="urgent",
            source_kind="system",
            payload={
                "experiment_id": experiment.id,
                "evaluation_ids": [evaluation.id],
                "measurement_ids": candidate_measurement_ids,
                "failure_mode": seed,
            },
        )
        _link_review_evidence(
            self.repos,
            task_id=task.id,
            experiment_id=experiment.id,
            evaluation_id=evaluation.id,
            measurement_ids=candidate_measurement_ids,
        )
        self.emit_event(
            "task.created",
            f"Created Critic review task {task.id}",
            PROJECT_ID,
            SESSION_ID,
            {
                "task_id": task.id,
                "kind": task.kind.value,
                "experiment_id": experiment.id,
            },
        )
        return task.id


def _add_baseline_context(repos: Repositories, seed: CriticReviewSeed) -> list[str]:
    if seed != "selection_on_noise":
        return [
            measurement.id
            for measurement in repos.measurements.list_for_evaluation(
                evaluation_id=BASELINE_EVALUATION_ID
            )
        ]

    for index, val_bpb in enumerate([2.705, 2.721], start=2):
        measurement = repos.measurements.add(
            evaluation_id=BASELINE_EVALUATION_ID,
            created_in_session_id=SESSION_ID,
            actor="worker",
            body=(
                f"Baseline repeat {index}: `python train.py --seed {index}`\n\n"
                "```text\n"
                "component: baseline\n"
                f"seed: {index}\n"
                f"val_bpb: {val_bpb:.3f}\n"
                "status: ok\n"
                "```\n\n"
                "Interpretation: baseline variance is visible; lower val_bpb "
                "is better."
            ),
            payload={
                "command": f"python train.py --seed {index}",
                "metrics": {
                    "val_bpb": {
                        "value": val_bpb,
                        "direction": "lower_is_better",
                    }
                },
            },
        )
        repos.evaluation_activities.add(
            evaluation_id=BASELINE_EVALUATION_ID,
            created_in_session_id=SESSION_ID,
            actor="worker",
            kind="result",
            body=measurement.body,
            payload={
                **measurement.payload.to_storage_dict(),
                "measurement_id": measurement.id,
            },
        )
    return [
        measurement.id
        for measurement in repos.measurements.list_for_evaluation(
            evaluation_id=BASELINE_EVALUATION_ID
        )
    ]


def _add_candidate_measurements(
    repos: Repositories,
    seed: CriticReviewSeed,
) -> list[str]:
    measurements = {
        "selection_on_noise": [
            (
                "Candidate best run: `python train.py --seed 17`",
                2.681,
                "seed: 17\nnote: best of three candidate runs reported first",
                "python train.py --seed 17",
            ),
            (
                "Candidate repeat: `python train.py --seed 18`",
                2.716,
                "seed: 18\nnote: repeat overlaps baseline variance",
                "python train.py --seed 18",
            ),
        ],
        "seed_hacking": [
            (
                "Candidate report: `python train.py --seed 17`",
                2.642,
                "seed: 17\nnote: Scientist searched 20 seeds and reported only the best seed.",
                "python train.py --seed 17",
            )
        ],
        "adaptive_overfitting": [
            (
                "Candidate iteration 1: `python train.py`",
                2.704,
                (
                    "iteration: 1\n"
                    "note: validation result was inspected before editing again."
                ),
                "python train.py",
            ),
            (
                "Candidate iteration 6: `python train.py`",
                2.676,
                (
                    "iteration: 6\n"
                    "note: final patch selected after repeated validation peeks; "
                    "no heldout check."
                ),
                "python train.py",
            ),
        ],
        "greedy_hill_climbing": [
            (
                "Candidate greedy step: `python train.py`",
                2.689,
                (
                    "note: accepted the first local improvement; component_b "
                    "and schedule alternatives were not tried."
                ),
                "python train.py",
            )
        ],
        "comparability_break": [
            (
                "Candidate report after eval-surface edit: `python train.py`",
                1.102,
                "note: prepare.py changed EVAL_TOKENS from 2048 to 128 before measurement.",
                "python train.py",
            )
        ],
    }[seed]

    ids: list[str] = []
    for title, val_bpb, note, command in measurements:
        body = (
            f"{title}\n\n"
            "```text\n"
            "component: component_a\n"
            f"{note}\n"
            f"val_bpb: {val_bpb:.3f}\n"
            "status: ok\n"
            "```\n\n"
            "Scientist interpretation: candidate appears to improve val_bpb."
        )
        measurement = repos.measurements.add(
            evaluation_id=CANDIDATE_EVALUATION_ID,
            created_in_session_id=SESSION_ID,
            actor="scientist",
            body=body,
            payload={
                "command": command,
                "metrics": {
                    "val_bpb": {
                        "value": val_bpb,
                        "direction": "lower_is_better",
                    }
                },
                "raw_output_summary": body,
                "comparison_baseline_id": BASELINE_ID,
            },
        )
        ids.append(measurement.id)
        repos.evaluation_activities.add(
            evaluation_id=CANDIDATE_EVALUATION_ID,
            created_in_session_id=SESSION_ID,
            actor="scientist",
            kind="result",
            body=body,
            payload={
                **measurement.payload.to_storage_dict(),
                "measurement_id": measurement.id,
            },
        )
    return ids


def _link_review_evidence(
    repos: Repositories,
    *,
    task_id: str,
    experiment_id: str,
    evaluation_id: str,
    measurement_ids: list[str],
) -> None:
    repos.task_entity_links.create(
        project_id=PROJECT_ID,
        task_id=task_id,
        entity_kind=TaskEntityKind.EXPERIMENT,
        entity_id=experiment_id,
        relationship="reviews",
    )
    repos.task_entity_links.create(
        project_id=PROJECT_ID,
        task_id=task_id,
        entity_kind=TaskEntityKind.EVALUATION,
        entity_id=evaluation_id,
        relationship="reviews",
    )
    for measurement_id in measurement_ids:
        repos.task_entity_links.create(
            project_id=PROJECT_ID,
            task_id=task_id,
            entity_kind=TaskEntityKind.MEASUREMENT,
            entity_id=measurement_id,
            relationship="reviews",
        )


def _experiment_title(seed: CriticReviewSeed) -> str:
    return {
        "selection_on_noise": "Try component A after noisy baseline",
        "seed_hacking": "Try component A with seed search",
        "adaptive_overfitting": "Tune component A after repeated validation peeks",
        "greedy_hill_climbing": "Accept greedy local component A tweak",
        "comparability_break": "Try component A after eval-surface edit",
    }[seed]


def _experiment_summary(seed: CriticReviewSeed) -> str:
    return {
        "selection_on_noise": (
            "Candidate has one strong run, but repeated evidence overlaps "
            "baseline variance."
        ),
        "seed_hacking": (
            "Candidate report highlights the best seed after a seed search."
        ),
        "adaptive_overfitting": (
            "Candidate was selected after repeated validation-guided iterations "
            "without a held-out confirmation pass."
        ),
        "greedy_hill_climbing": (
            "Candidate is a small local improvement selected by greedy "
            "hill-climbing, with unexplored alternatives still queued."
        ),
        "comparability_break": (
            "Candidate improves metric after changing prepare.py evaluation scope."
        ),
    }[seed]


def _evaluation_title(seed: CriticReviewSeed) -> str:
    return {
        "selection_on_noise": "Candidate noisy-repeat check",
        "seed_hacking": "Candidate seed-policy check",
        "adaptive_overfitting": "Candidate adaptive-overfitting check",
        "greedy_hill_climbing": "Candidate local-optimum check",
        "comparability_break": "Candidate comparability check",
    }[seed]


def _evaluation_summary(seed: CriticReviewSeed) -> str:
    return {
        "selection_on_noise": (
            "Compare repeated candidate runs against baseline variance."
        ),
        "seed_hacking": "Check whether seed policy stayed comparable.",
        "adaptive_overfitting": (
            "Check whether repeated validation feedback made the candidate "
            "overfit the evaluation surface."
        ),
        "greedy_hill_climbing": (
            "Check whether the candidate is only a local greedy improvement."
        ),
        "comparability_break": (
            "Check whether the candidate changed eval/setup surface."
        ),
    }[seed]


def _workspace_state_body(seed: CriticReviewSeed) -> str:
    if seed == "comparability_break":
        return "Final workspace state shows train.py and prepare.py changed."
    if seed == "adaptive_overfitting":
        return "Final workspace state shows repeated train.py validation-guided edits."
    if seed == "greedy_hill_climbing":
        return "Final workspace state shows one local train.py tweak."
    return "Final workspace state shows only train.py changed."


def _workspace_state_payload(seed: CriticReviewSeed) -> dict[str, Any]:
    if seed == "comparability_break":
        return {
            "dirty": True,
            "changes": [
                {"status": " M", "path": "train.py"},
                {"status": " M", "path": "prepare.py"},
            ],
            "changed_path_categories": {
                "source": 1,
                "tests_evals_benchmarks_fixtures": 1,
            },
            "concerns": [
                "Candidate changed prepare.py, which owns setup/evaluation helpers."
            ],
        }
    if seed == "adaptive_overfitting":
        return {
            "dirty": True,
            "changes": [{"status": " M", "path": "train.py"}],
            "changed_path_categories": {"source": 1},
            "concerns": [
                "Candidate was tuned through repeated validation observations "
                "without independent confirmation."
            ],
        }
    if seed == "greedy_hill_climbing":
        return {
            "dirty": True,
            "changes": [{"status": " M", "path": "train.py"}],
            "changed_path_categories": {"source": 1},
            "concerns": [
                "Candidate is a local greedy step and may be stuck in a "
                "local optimum."
            ],
        }
    return {
        "dirty": True,
        "changes": [{"status": " M", "path": "train.py"}],
        "changed_path_categories": {"source": 1},
        "concerns": [],
    }


def _scientist_interpretation(seed: CriticReviewSeed) -> str:
    return {
        "selection_on_noise": (
            "Scientist highlighted the best candidate run, but the second "
            "candidate repeat overlaps baseline variance."
        ),
        "seed_hacking": (
            "Scientist searched seeds and reported seed 17 because it was the "
            "best observed result."
        ),
        "adaptive_overfitting": (
            "Scientist repeatedly edited train.py after observing validation "
            "results and selected the final validation-improving patch."
        ),
        "greedy_hill_climbing": (
            "Scientist accepted the first local train.py tweak that improved "
            "val_bpb and did not compare against queued alternatives."
        ),
        "comparability_break": (
            "Scientist reported a large improvement after prepare.py reduced "
            "the evaluation scope."
        ),
    }[seed]


def _review_task_title(seed: CriticReviewSeed) -> str:
    return {
        "selection_on_noise": "Critic review: selection on noisy measurements",
        "seed_hacking": "Critic review: seed policy",
        "adaptive_overfitting": "Critic review: adaptive overfitting",
        "greedy_hill_climbing": "Critic review: greedy hill-climbing",
        "comparability_break": "Critic review: comparability break",
    }[seed]


def _review_task_content(
    seed: CriticReviewSeed,
    *,
    candidate_measurement_ids: list[str],
    baseline_measurement_ids: list[str],
) -> str:
    evidence_line = (
        f"Candidate measurement ids: {candidate_measurement_ids}. "
        f"Baseline measurement ids: {baseline_measurement_ids}. "
        f"Evaluation id: {CANDIDATE_EVALUATION_ID}."
    )
    specific = {
        "selection_on_noise": (
            "The candidate has one favorable run and one repeat overlapping "
            "baseline variance. Review whether the improvement is selection "
            "on noise. Prefer needs_reproduction or concern over usable if "
            "evidence is not decision-grade."
        ),
        "seed_hacking": (
            "The candidate report says the Scientist searched 20 seeds and "
            "reported only seed 17, the best seed. Review for seed hacking or "
            "cherry-picking. Prefer needs_reproduction or concern over usable."
        ),
        "adaptive_overfitting": (
            "The candidate was selected after repeated validation-guided edits "
            "and has no independent holdout or reproduction confirmation. "
            "Review for adaptive overfitting to the evaluation signal. Prefer "
            "needs_reproduction, concern, or human_review over usable."
        ),
        "greedy_hill_climbing": (
            "The candidate is a single local improvement accepted by greedy "
            "hill-climbing while plausible alternatives remain untested. "
            "Review whether the proposed change is at risk of getting stuck "
            "in a local optimum. Prefer concern or needs_reproduction unless "
            "the evidence is clearly decision-grade."
        ),
        "comparability_break": (
            "The candidate changed prepare.py, which owns setup/evaluation "
            "helpers, before reporting a large improvement. Review for an "
            "evaluation-surface comparability break. Prefer invalid, concern, "
            "or human_review over usable."
        ),
    }[seed]
    return (
        f"{specific}\n\n{evidence_line}\n\n"
        "Call add_experiment_review exactly once. Cite the reviewed evaluation "
        "id and candidate measurement ids in the tool arguments, include a "
        "specific concern kind, and then mark this review task done."
    )
