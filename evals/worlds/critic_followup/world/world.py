from __future__ import annotations

from typing import Any

from situ.harness.api.project_board import ProjectBoardService
from situ.harness.records import (
    AgentKind,
    TaskEntityKind,
    TaskKind,
    TaskStatus,
    TaskWorkType,
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

    async def _seed_review_followup(self, seed: CriticFollowupSeed) -> str:
        experiment = await self.repos.experiments.create(
            experiment_id=FOLLOWUP_EXPERIMENT_ID,
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title=_experiment_title(seed),
            summary=_experiment_summary(seed),
            status="closed",
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
            status="closed",
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
        await self.repos.experiment_activities.add(
            experiment_id=experiment.id,
            created_in_session_id=SESSION_ID,
            actor="critic",
            kind="comment",
            body=_review_body(seed),
            payload={
                "activity_type": "critic_review",
                "verdict": _review_verdict(seed),
                "recommended_next_step": _recommended_next_step(seed),
                "evidence_summary": _review_evidence_summary(seed),
                "concern_kinds": _concern_kinds(seed),
                "reviewed_evaluation_ids": [evaluation.id],
                "reviewed_measurement_ids": [measurement.id],
            },
        )
        review_task = await self.repos.tasks.create(
            task_id=await self.repos.tasks.next_id(project_id=PROJECT_ID),
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            title=f"Completed Critic review for {experiment.title}",
            content="Critic review has been recorded for this experiment.",
            kind=TaskKind.REVIEW,
            work_type=TaskWorkType.REVIEW_EXPERIMENT,
            priority="high",
            source_kind="system",
            payload={
                "experiment_id": experiment.id,
                "evaluation_ids": [evaluation.id],
                "measurement_ids": [measurement.id],
            },
        )
        critic = await self.repos.agents.ensure_project_agent(
            project_id=PROJECT_ID,
            created_in_session_id=SESSION_ID,
            kind=AgentKind.CRITIC,
            display_name="Critic",
        )
        await self.repos.tasks.update(
            task_id=review_task.id,
            assignee_id=critic.id,
            status=TaskStatus.DONE,
            result_summary="Critic review recorded.",
            completed_in_session_id=SESSION_ID,
        )
        for entity_kind, entity_id in (
            (TaskEntityKind.EXPERIMENT, experiment.id),
            (TaskEntityKind.EVALUATION, evaluation.id),
            (TaskEntityKind.MEASUREMENT, measurement.id),
        ):
            await self.repos.task_entity_links.create(
                project_id=PROJECT_ID,
                task_id=review_task.id,
                entity_kind=entity_kind,
                entity_id=entity_id,
                relationship="reviews",
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
                "review_task_id": review_task.id,
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
            f"base_commit={FOLLOWUP_CANDIDATE_COMMIT}. Do not accept or build "
            "on the candidate until reproduction exists."
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
            "file the next useful Scientist experiment task that builds on or "
            "combines the accepted result. The task payload must include "
            f"parent_experiment_id={FOLLOWUP_EXPERIMENT_ID}, "
            f"research_thread={FOLLOWUP_RESEARCH_THREAD}, and "
            f"base_commit={FOLLOWUP_CANDIDATE_COMMIT}."
        ),
    }[seed]
