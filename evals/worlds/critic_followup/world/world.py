from __future__ import annotations

from typing import Any

from situ.harness.api.project_overview import ProjectOverviewService
from situ.harness.records import (
    AgentKind,
    RecordStatus,
    TaskKind,
)
from situ.harness.repositories import Repositories

from evals.framework.models import EvalEvent
from evals.worlds.critic_followup.models import CriticFollowupSeed
from evals.worlds.repo_bootstrap.world.world import (
    BASELINE_ID,
    PROJECT_ID,
    SESSION_ID,
    WORKSPACE_ID,
    RepoBootstrapWorld,
)

MANAGER_AGENT_ID = f"agent_{PROJECT_ID}_manager"
CRITIC_AGENT_ID = f"agent_{PROJECT_ID}_critic"
FOLLOWUP_EXPERIMENT_ID = "EX1"
FOLLOWUP_EVALUATION_ID = "EV2"
FOLLOWUP_CANDIDATE_COMMIT = "eval-fixture-candidate-component-a"
FOLLOWUP_RESEARCH_THREAD = "component_a"
LATE_GAME_EXPERIMENT_COUNT = 100
LATE_GAME_STACK_PARENT_ID = "EX87"
LATE_GAME_REPRO_PARENT_ID = "EX92"
LATE_GAME_STACK_RESEARCH_THREAD = "optimizer_schedule"
LATE_GAME_REPRO_RESEARCH_THREAD = "regularization_mix"
LATE_GAME_STACK_HYPOTHESIS_ID = "H3"
LATE_GAME_REPRO_HYPOTHESIS_ID = "H4"


class CriticFollowupWorld:
    def __init__(self, *, repo_world: RepoBootstrapWorld, seed: CriticFollowupSeed) -> None:
        self._repo_world = repo_world
        self.seed = seed

    @classmethod
    async def create(cls, *, seed: CriticFollowupSeed) -> "CriticFollowupWorld":
        world = cls(
            repo_world=await RepoBootstrapWorld.create(seed="with_baseline_result"),
            seed=seed,
        )
        await world.repos.agents.ensure_project_agent(
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            kind=AgentKind.MANAGER,
            display_name="Manager",
            model_name="eval:model",
        )
        await world.repos.agents.ensure_project_agent(
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            kind=AgentKind.CRITIC,
            display_name="Critic",
            model_name="eval:model",
        )
        if seed in {"late_game_portfolio", "late_game_reproduction_queue"}:
            world.plan_task_id = await world._seed_late_game_followup(seed=seed)
        else:
            world.plan_task_id = await world._seed_review_followup(seed)
        return world

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

    async def emit_event(
        self,
        event_type: str,
        message: str,
        associated_project_id: str | None,
        associated_session_id: str | None,
        payload: dict[str, Any] | None,
    ) -> dict[str, Any]:
        return await self._repo_world.emit_event(
            event_type,
            message,
            associated_project_id,
            associated_session_id,
            payload,
        )

    async def project_overview(self) -> dict[str, Any]:
        return (
            await ProjectOverviewService(repos=self.repos).get_project_overview(
                session_id=SESSION_ID
            )
        ).model_dump(mode="json")

    def workspace_files(self) -> dict[str, str]:
        return self._repo_world.workspace_files()

    def changed_files(self) -> list[str]:
        return self._repo_world.changed_files()

    async def _seed_review_followup(self, seed: CriticFollowupSeed) -> str:
        experiment = await self.repos.experiments.create(
            experiment_id=FOLLOWUP_EXPERIMENT_ID,
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title=_experiment_title(seed),
            summary=_experiment_summary(seed),
            status=(
                RecordStatus.DONE
                if seed == "usable"
                else RecordStatus.CANCELED
            ),
            worktree_path=str(self.workspace_path),
            base_commit="eval-fixture-base",
            candidate_commit=FOLLOWUP_CANDIDATE_COMMIT,
            research_thread=FOLLOWUP_RESEARCH_THREAD,
        )
        evaluation = await self.repos.evaluations.create(
            evaluation_id=FOLLOWUP_EVALUATION_ID,
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title="Candidate validation check",
            summary="Candidate evidence reviewed by the Critic.",
            associated_experiment_id=experiment.id,
            status=RecordStatus.DONE,
        )
        measurement = await self.repos.measurements.add(
            evaluation_id=evaluation.id,
            created_in_session_id=SESSION_ID,
            actor="scientist",
            body=_measurement_body(seed),
            payload={
                "command": "python train.py",
                "metrics": {
                    "val_bpb": {
                        "value": _measurement_value(seed),
                        "direction": "lower_is_better",
                    }
                },
                "comparison_baseline_id": BASELINE_ID,
            },
        )
        from_status = "in_review"
        to_status = "done" if seed == "usable" else "canceled"
        await self.repos.experiment_activities.add(
            experiment_id=experiment.id,
            created_in_session_id=SESSION_ID,
            actor="critic",
            kind="status_updated",
            body=f"Status changed from {from_status} to {to_status}.",
            payload={"from_status": from_status, "to_status": to_status},
        )
        await self.repos.experiment_activities.add(
            experiment_id=experiment.id,
            created_in_session_id=SESSION_ID,
            actor="critic",
            kind="comment",
            body=_review_body(seed),
            payload={
                "activity_type": "review_transition_comment",
                "verdict": _review_verdict(seed),
                "recommended_next_step": _recommended_next_step(seed),
                "evidence_summary": _review_evidence_summary(seed),
                "concern_kinds": _concern_kinds(seed),
                "reviewed_evaluation_ids": [evaluation.id],
                "reviewed_measurement_ids": [measurement.id],
            },
        )

        plan_task = await self.repos.tasks.create(
            task_id=await self.repos.tasks.next_id(project_id=PROJECT_ID),
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title=f"Plan after {_review_verdict(seed)} Critic review",
            content=_plan_task_content(seed),
            kind=TaskKind.PLAN,
            priority="high",
            source_kind="system",
            payload={
                "experiment_id": experiment.id,
                "review_verdict": _review_verdict(seed),
                "candidate_commit": experiment.candidate_commit,
                "research_thread": experiment.research_thread,
            },
        )
        await self.emit_event(
            "task.created",
            f"Created Manager follow-up task {plan_task.id}",
            PROJECT_ID,
            SESSION_ID,
            {
                "task_id": plan_task.id,
                "kind": plan_task.kind.value,
                "review_verdict": _review_verdict(seed),
            },
        )
        return plan_task.id

    async def _seed_late_game_followup(self, *, seed: CriticFollowupSeed) -> str:
        await self._seed_late_game_hypotheses()
        for index in range(1, LATE_GAME_EXPERIMENT_COUNT + 1):
            await self._seed_late_game_experiment(index=index, seed=seed)

        plan_task = await self.repos.tasks.create(
            task_id=await self.repos.tasks.next_id(project_id=PROJECT_ID),
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title=_late_game_plan_task_title(seed),
            content=_late_game_plan_task_content(seed),
            kind=TaskKind.PLAN,
            priority="high",
            source_kind="system",
            payload={
                "late_game_experiment_count": LATE_GAME_EXPERIMENT_COUNT,
                "expected_stack_parent_experiment_id": LATE_GAME_STACK_PARENT_ID,
                "expected_reproduction_parent_experiment_id": LATE_GAME_REPRO_PARENT_ID,
            },
        )
        await self.emit_event(
            "task.created",
            f"Created late-game Manager follow-up task {plan_task.id}",
            PROJECT_ID,
            SESSION_ID,
            {
                "task_id": plan_task.id,
                "kind": plan_task.kind.value,
                "seed": seed,
                "late_game_experiment_count": LATE_GAME_EXPERIMENT_COUNT,
            },
        )
        return plan_task.id

    async def _seed_late_game_hypotheses(self) -> None:
        specs = [
            (
                "H2",
                "Learning-rate warmup might reduce early instability",
                "Tune warmup without changing the evaluation surface.",
            ),
            (
                LATE_GAME_STACK_HYPOTHESIS_ID,
                "Optimizer schedule descendants can keep improving val_bpb",
                "Stack small optimizer-schedule changes on reviewed candidates.",
            ),
            (
                LATE_GAME_REPRO_HYPOTHESIS_ID,
                "Regularization mix might be a large but noisy improvement",
                "Reproduce regularization wins before building on them.",
            ),
            (
                "H5",
                "Architecture width is mostly saturated",
                "Keep architecture changes as exploration only unless results move.",
            ),
        ]
        for hypothesis_id, title, summary in specs:
            existing = await self.repos.hypotheses.get(hypothesis_id=hypothesis_id)
            if existing is not None:
                continue
            await self.repos.hypotheses.create(
                hypothesis_id=hypothesis_id,
                project_id=PROJECT_ID,
                created_in_session_id=SESSION_ID,
                title=title,
                summary=summary,
                status=RecordStatus.ACTIVE,
            )

    async def _seed_late_game_experiment(
        self,
        *,
        index: int,
        seed: CriticFollowupSeed,
    ) -> None:
        experiment_id = f"EX{index}"
        evaluation_id = f"EV{index + 1}"
        spec = _late_game_experiment_spec(index=index, seed=seed)
        experiment = await self.repos.experiments.create(
            experiment_id=experiment_id,
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title=spec["title"],
            summary=spec["summary"],
            status=spec["status"],
            worktree_path=str(self.workspace_path),
            base_commit=spec["base_commit"],
            candidate_commit=spec["candidate_commit"],
            parent_experiment_id=spec["parent_experiment_id"],
            research_thread=spec["research_thread"],
        )
        await self.repos.hypothesis_experiment_links.create(
            hypothesis_id=spec["hypothesis_id"],
            experiment_id=experiment.id,
        )
        evaluation = await self.repos.evaluations.create(
            evaluation_id=evaluation_id,
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title=f"Evaluation for {experiment.id}",
            summary=spec["evaluation_summary"],
            associated_experiment_id=experiment.id,
            status=RecordStatus.DONE,
        )
        measurement = await self.repos.measurements.add(
            evaluation_id=evaluation.id,
            created_in_session_id=SESSION_ID,
            actor="scientist",
            body=(
                f"Experiment {experiment.id}: `python train.py` measured "
                f"val_bpb={spec['metric']:.3f} on thread "
                f"`{spec['research_thread']}`."
            ),
            payload={
                "command": "python train.py",
                "metrics": {
                    "val_bpb": {
                        "value": spec["metric"],
                        "direction": "lower_is_better",
                    }
                },
                "comparison_baseline_id": BASELINE_ID,
            },
        )
        await self.repos.experiment_activities.add(
            experiment_id=experiment.id,
            created_in_session_id=SESSION_ID,
            actor="critic",
            kind="status_updated",
            body=f"Status changed from in_review to {spec['status'].value}.",
            payload={
                "from_status": "in_review",
                "to_status": spec["status"].value,
            },
        )
        await self.repos.experiment_activities.add(
            experiment_id=experiment.id,
            created_in_session_id=SESSION_ID,
            actor="critic",
            kind="comment",
            body=spec["review_body"],
            payload={
                "activity_type": "review_transition_comment",
                "verdict": spec["verdict"],
                "recommended_next_step": spec["recommended_next_step"],
                "evidence_summary": spec["evidence_summary"],
                "concern_kinds": spec["concern_kinds"],
                "reviewed_evaluation_ids": [evaluation.id],
                "reviewed_measurement_ids": [measurement.id],
            },
        )


def _experiment_title(seed: CriticFollowupSeed) -> str:
    return {
        "needs_reproduction": "Component A promising but noisy",
        "invalid": "Component A with invalid comparison",
        "human_review": "Component A with ambiguous integrity signal",
        "usable": "Component A reproduced improvement",
    }[seed]


def _experiment_summary(seed: CriticFollowupSeed) -> str:
    return {
        "needs_reproduction": (
            "Candidate looks better, but the Critic said evidence is too thin."
        ),
        "invalid": "Candidate improvement is invalid because comparability broke.",
        "human_review": "Candidate needs human review before further automation.",
        "usable": "Candidate has reproduced evidence and can be built on.",
    }[seed]


def _measurement_body(seed: CriticFollowupSeed) -> str:
    return (
        "Candidate command: `python train.py`\n\n"
        "```text\n"
        "component: component_a\n"
        f"val_bpb: {_measurement_value(seed):.3f}\n"
        "status: ok\n"
        "```\n\n"
        f"Scientist interpretation: {_measurement_interpretation(seed)}"
    )


def _measurement_value(seed: CriticFollowupSeed) -> float:
    return {
        "needs_reproduction": 2.681,
        "invalid": 1.102,
        "human_review": 2.676,
        "usable": 2.676,
    }[seed]


def _measurement_interpretation(seed: CriticFollowupSeed) -> str:
    return {
        "needs_reproduction": "promising, but only one strong run is recorded.",
        "invalid": "appears much better after prepare.py changed the eval surface.",
        "human_review": "promising, but there is an unexplained data-integrity warning.",
        "usable": "reproduced improvement with comparable command and workspace state.",
    }[seed]


def _review_verdict(seed: CriticFollowupSeed) -> str:
    return {
        "needs_reproduction": "needs_reproduction",
        "invalid": "invalid",
        "human_review": "human_review",
        "usable": "usable",
    }[seed]


def _recommended_next_step(seed: CriticFollowupSeed) -> str:
    return {
        "needs_reproduction": "reproduce",
        "invalid": "discard",
        "human_review": "human_review",
        "usable": "accept",
    }[seed]


def _concern_kinds(seed: CriticFollowupSeed) -> list[str]:
    return {
        "needs_reproduction": ["selection_on_noise", "thin_evidence"],
        "invalid": ["comparability_break", "eval_surface_changed"],
        "human_review": ["data_integrity_warning"],
        "usable": [],
    }[seed]


def _review_evidence_summary(seed: CriticFollowupSeed) -> str:
    return {
        "needs_reproduction": (
            "Single favorable candidate measurement lacks repeated confirmation."
        ),
        "invalid": (
            "The candidate changed prepare.py, so the reported val_bpb is not comparable."
        ),
        "human_review": (
            "The evidence is promising but includes an unexplained integrity warning."
        ),
        "usable": (
            "Repeated comparable measurements support using component_a as context."
        ),
    }[seed]


def _review_body(seed: CriticFollowupSeed) -> str:
    return {
        "needs_reproduction": (
            "Promising result, but evidence is thin. Reproduce before accepting."
        ),
        "invalid": (
            "Invalid comparison: prepare.py changed the evaluation surface. "
            "Discard this metric as an improvement signal."
        ),
        "human_review": (
            "Human review required because the result has an unexplained "
            "data-integrity warning."
        ),
        "usable": (
            "Usable result: comparable repeated evidence supports component_a."
        ),
    }[seed]


def _plan_task_content(seed: CriticFollowupSeed) -> str:
    common = (
        "Read the completed Critic review activity for the candidate experiment "
        f"{FOLLOWUP_EXPERIMENT_ID}, then record a lineage decision on that "
        "experiment before creating exactly one next task. "
    )
    return common + {
        "needs_reproduction": (
            "Because the verdict is needs_reproduction, record decision "
            "`reproduce`, then file a Scientist experiment task to reproduce "
            "the candidate with the same command and comparable workspace "
            "state. The task payload must include "
            f"parent_experiment_id={FOLLOWUP_EXPERIMENT_ID}, "
            f"research_thread={FOLLOWUP_RESEARCH_THREAD}, and "
            f"base_commit={FOLLOWUP_CANDIDATE_COMMIT}. Also pass "
            "hypothesis_ids=['H1']. Do not accept or build on the candidate "
            "until reproduction exists."
        ),
        "invalid": (
            "Because the verdict is invalid, do not accept the reported "
            "improvement. File a task that discards or revises the candidate "
            "around the comparability break before any further experiment."
        ),
        "human_review": (
            "Because the verdict is human_review, file a Researcher interpret "
            "task that captures the human-review blocker and asks for human "
            "decision before new Scientist candidate work."
        ),
        "usable": (
            "Because the verdict is usable, record decision `continue`, then "
            "file the next useful Scientist experiment task that stacks on the "
            "accepted candidate state. The task payload must include "
            f"parent_experiment_id={FOLLOWUP_EXPERIMENT_ID}, "
            f"research_thread={FOLLOWUP_RESEARCH_THREAD}, "
            "base_selector='parent_experiment', and hypothesis_ids=['H1']. "
            "Do not pass base_commit for this continuation; let the parent "
            "experiment's candidate commit define the base."
        ),
    }[seed]


def _late_game_experiment_spec(
    *,
    index: int,
    seed: CriticFollowupSeed,
) -> dict[str, Any]:
    threads = [
        ("component_a", "H1"),
        ("warmup", "H2"),
        (LATE_GAME_STACK_RESEARCH_THREAD, LATE_GAME_STACK_HYPOTHESIS_ID),
        (LATE_GAME_REPRO_RESEARCH_THREAD, LATE_GAME_REPRO_HYPOTHESIS_ID),
        ("width_sweep", "H5"),
    ]
    research_thread, hypothesis_id = threads[index % len(threads)]
    metric = 2.705 - (index % 17) * 0.003
    status = RecordStatus.DONE
    verdict = "usable"
    recommended_next_step = "accept"
    concern_kinds: list[str] = []
    review_body = "Usable comparison, but not the strongest current direction."
    evidence_summary = "Comparable command and workspace state."

    if index % 11 == 0:
        status = RecordStatus.CANCELED
        verdict = "invalid"
        recommended_next_step = "discard"
        concern_kinds = ["comparability_break"]
        review_body = "Invalid comparison; this changed the measurement surface."
        evidence_summary = "Do not use this result as progress."
    elif index % 7 == 0:
        status = RecordStatus.CANCELED
        verdict = "needs_reproduction"
        recommended_next_step = "reproduce"
        concern_kinds = ["thin_evidence", "selection_on_noise"]
        review_body = "Promising, but too thin to build on without reproduction."
        evidence_summary = "One favorable run with no repeated confirmation."
    elif index % 13 == 0:
        status = RecordStatus.FAILED
        verdict = "failed"
        recommended_next_step = "discard"
        concern_kinds = ["run_failed"]
        review_body = "Experiment failed before producing usable evidence."
        evidence_summary = "No trustworthy measurement was produced."

    if index == int(LATE_GAME_STACK_PARENT_ID.removeprefix("EX")):
        research_thread = LATE_GAME_STACK_RESEARCH_THREAD
        hypothesis_id = LATE_GAME_STACK_HYPOTHESIS_ID
        metric = 2.621
        status = RecordStatus.DONE
        verdict = "usable"
        recommended_next_step = "continue"
        concern_kinds = []
        review_body = (
            "Usable aggregate candidate: optimizer_schedule has the best "
            "reviewed descendant patch with repeated comparable evidence."
        )
        evidence_summary = (
            "Best reviewed aggregate candidate; build a small descendant on "
            "this candidate commit."
        )
    elif index == int(LATE_GAME_REPRO_PARENT_ID.removeprefix("EX")):
        research_thread = LATE_GAME_REPRO_RESEARCH_THREAD
        hypothesis_id = LATE_GAME_REPRO_HYPOTHESIS_ID
        metric = 2.589
        status = RecordStatus.CANCELED
        verdict = "needs_reproduction"
        recommended_next_step = "reproduce"
        concern_kinds = ["selection_on_noise", "thin_evidence"]
        review_body = (
            "Largest numerical win, but not usable yet: reproduce before "
            "continuing or stacking this regularization_mix candidate."
        )
        evidence_summary = (
            "Best raw metric, but evidence is thin and should be repeated "
            "before it becomes a parent for descendant work."
        )

    if seed == "late_game_reproduction_queue" and index == int(
        LATE_GAME_STACK_PARENT_ID.removeprefix("EX")
    ):
        metric = 2.642
        review_body = (
            "Usable optimizer_schedule candidate, but the larger "
            "regularization_mix result should be reproduced first."
        )
        evidence_summary = "Reviewed and usable, but not the highest-priority gate."

    candidate_commit = f"eval-fixture-candidate-ex{index}"
    base_commit = "eval-fixture-base" if index == 1 else f"eval-fixture-candidate-ex{index - 1}"
    parent_experiment_id = None if index == 1 else f"EX{index - 1}"
    return {
        "title": f"Late-game {research_thread} candidate EX{index}",
        "summary": (
            f"{research_thread} candidate with reviewed verdict {verdict} "
            f"and val_bpb {metric:.3f}."
        ),
        "evaluation_summary": f"Comparable measurement for EX{index}.",
        "status": status,
        "verdict": verdict,
        "recommended_next_step": recommended_next_step,
        "concern_kinds": concern_kinds,
        "review_body": review_body,
        "evidence_summary": evidence_summary,
        "metric": metric,
        "candidate_commit": candidate_commit,
        "base_commit": base_commit,
        "parent_experiment_id": parent_experiment_id,
        "research_thread": research_thread,
        "hypothesis_id": hypothesis_id,
    }


def _late_game_plan_task_title(seed: CriticFollowupSeed) -> str:
    return {
        "late_game_portfolio": "Plan from a mature experiment portfolio",
        "late_game_reproduction_queue": "Plan reproduction from mature portfolio",
    }[seed]


def _late_game_plan_task_content(seed: CriticFollowupSeed) -> str:
    common = (
        f"This is a late-game portfolio with {LATE_GAME_EXPERIMENT_COUNT} prior "
        "experiments across several research threads. Read the overview and "
        "Critic review activities before creating follow-up work. Record a "
        "lineage decision on the chosen experiment before filing exactly one "
        "next task. Do not create a new baseline."
    )
    return common + " " + {
        "late_game_portfolio": (
            f"Choose {LATE_GAME_STACK_PARENT_ID}: it is the best reviewed usable "
            "aggregate candidate, even though another record has a flashier raw "
            "number but needs reproduction. Record decision `continue` on "
            f"{LATE_GAME_STACK_PARENT_ID}, then file a Scientist experiment task "
            "that stacks a small descendant on it. The task payload must include "
            "base_selector='parent_experiment', "
            f"parent_experiment_id='{LATE_GAME_STACK_PARENT_ID}', "
            f"research_thread='{LATE_GAME_STACK_RESEARCH_THREAD}', and "
            f"hypothesis_ids=['{LATE_GAME_STACK_HYPOTHESIS_ID}']. The task text "
            "should say this is exploit/stacking work and should briefly name "
            "why the noisy regularization_mix result is not the parent."
        ),
        "late_game_reproduction_queue": (
            f"Choose {LATE_GAME_REPRO_PARENT_ID}: it has the strongest raw "
            "metric, but its Critic verdict is needs_reproduction, so the next "
            "step is reproduction rather than stacking. Record decision "
            f"`reproduce` on {LATE_GAME_REPRO_PARENT_ID}, then file a Scientist "
            "experiment task to reproduce it from the same candidate state. "
            f"The task payload must include parent_experiment_id='{LATE_GAME_REPRO_PARENT_ID}', "
            f"research_thread='{LATE_GAME_REPRO_RESEARCH_THREAD}', "
            f"base_commit='eval-fixture-candidate-ex{LATE_GAME_REPRO_PARENT_ID.removeprefix('EX')}', "
            f"and hypothesis_ids=['{LATE_GAME_REPRO_HYPOTHESIS_ID}']. The task "
            "text should say not to continue/stack this thread until the "
            "reproduction confirms it."
        ),
    }[seed]
