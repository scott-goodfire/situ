from __future__ import annotations

import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

from situ.harness.app import HarnessApp
from situ.harness.config import LocalSecretStore, SituSecrets
from situ.harness.core.dbos.runtime import reset_dbos_for_tests

from evals.framework.models import EvalEvent
from evals.worlds.app_session_loop.models import (
    AppSessionLoopEvalInput,
    AppSessionLoopSeed,
)
from evals.worlds.repo_bootstrap.world.world import (
    BASELINE_ID,
    BASELINE_EVALUATION_ID,
    FIXTURE_FILES,
    HYPOTHESIS_ID,
)

SESSION_ID = "S1"


class AppSessionLoopWorld:
    def __init__(self, args: AppSessionLoopEvalInput) -> None:
        self.args = args
        self._tmp = TemporaryDirectory()
        self.root = Path(self._tmp.name)
        self.workspace_path = self.root / "fixture-repo"
        self.workspace_path.mkdir(parents=True)
        self._write_fixture_repo()
        self._init_git_repo()

        self.app = HarnessApp(
            self.workspace_path,
            app_root=Path.cwd(),
            project_home=self.root / "home",
            notify=lambda _method, _params: None,
        )
        self.session_id = SESSION_ID

    @classmethod
    async def create(cls, args: AppSessionLoopEvalInput) -> "AppSessionLoopWorld":
        world = cls(args)
        world.workspace = await world.app.repos.workspaces.ensure()
        world.project = await world.app.repos.projects.create(
            project_id=await world.app.repos.projects.next_id(
                workspace_id=world.workspace.id,
            ),
            workspace_id=world.workspace.id,
            title="Improve validation bits per byte",
            objective=args.objective,
            research_context=args.research_context,
        )
        world.session = await world.app.repos.sessions.create(
            session_id=world.session_id,
            workspace_id=world.workspace.id,
            project_id=world.project.id,
        )
        world.app._session_setup[world.session_id] = {
            "objective": world.project.objective,
            "research_context": world.project.research_context,
        }
        await world.app._ensure_project_agents(
            session_id=world.session_id,
            project_id=world.project.id,
        )
        await world._seed(args.seed)
        await world.app._enqueue_plan_task(
            session_id=world.session_id,
            project_id=world.project.id,
            title=_initial_plan_title(args.seed),
            content=_initial_plan_content(args.seed),
            source_kind="system",
        )
        return world

    async def run(self) -> None:
        self._install_eval_runtime_secrets()
        await self.app._execute_session_async(
            session_id=self.session_id,
            max_experiments=self.args.max_experiments,
        )

    def teardown(self) -> None:
        try:
            reset_dbos_for_tests()
        finally:
            self._tmp.cleanup()

    async def project_board(self) -> dict[str, Any]:
        return (
            await self.app.project_board_api.get_project_board(session_id=self.session_id)
        ).model_dump(mode="json")

    async def artifact_files(self) -> dict[str, str]:
        files: dict[str, str] = {}
        for artifact in (await self.project_board()).get("artifacts", []):
            artifact_id = artifact.get("id")
            artifact_path = artifact.get("path")
            if not isinstance(artifact_id, str) or not isinstance(artifact_path, str):
                continue
            path = Path(artifact_path)
            if not path.is_absolute():
                path = self.app.context.project_dir / path
            if not path.is_file():
                continue
            files[artifact_id] = path.read_text(encoding="utf-8", errors="replace")
        return files

    def _install_eval_runtime_secrets(self) -> None:
        secrets = SituSecrets()
        secrets.require_eval_environment()
        store = LocalSecretStore(home=self.app.context.home)
        store.set_anthropic_key(secrets.require_eval_anthropic_key())
        store.set_logfire_token(secrets.require_eval_logfire_token())

    async def events(self) -> list[EvalEvent]:
        return [
            EvalEvent(
                event_type=event.type,
                message=event.message,
                payload={
                    "id": event.id,
                    "associated_project_id": event.associated_project_id,
                    "associated_session_id": event.associated_session_id,
                    **event.payload,
                },
            )
            for event in await self.app.repos.events.list_for_session(
                session_id=self.session_id
            )
        ]

    def workspace_files(self) -> dict[str, str]:
        return {
            relative_path: (self.workspace_path / relative_path).read_text(
                encoding="utf-8"
            )
            for relative_path in sorted(FIXTURE_FILES)
        }

    def changed_files(self) -> list[str]:
        current = self.workspace_files()
        return [
            relative_path
            for relative_path, original in FIXTURE_FILES.items()
            if current.get(relative_path) != f"{original}\n"
        ]

    def _write_fixture_repo(self) -> None:
        for relative_path, content in FIXTURE_FILES.items():
            (self.workspace_path / relative_path).write_text(
                f"{content}\n",
                encoding="utf-8",
            )

    def _init_git_repo(self) -> None:
        _run_git(self.workspace_path, "init")
        _run_git(self.workspace_path, "config", "user.email", "situ-eval@example.com")
        _run_git(self.workspace_path, "config", "user.name", "Situ Eval")
        _run_git(self.workspace_path, "add", ".")
        _run_git(self.workspace_path, "commit", "-m", "fixture baseline")

    async def _seed(self, seed: AppSessionLoopSeed) -> None:
        if seed not in {"with_baseline_no_hypothesis", "with_baseline_result"}:
            return
        if seed == "with_baseline_result":
            await self.app.repos.hypotheses.create(
                hypothesis_id=HYPOTHESIS_ID,
                project_id=self.project.id,
                created_in_session_id=self.session_id,
                title="Train.py variants can improve val_bpb",
                summary="Try narrow train.py variants and compare against baseline.",
                status="active",
            )
        baseline = await self.app.repos.baselines.create(
            baseline_id=BASELINE_ID,
            project_id=self.project.id,
            created_in_session_id=self.session_id,
            title="Baseline train.py reference",
            summary="Reference workspace behavior before variants.",
            status="closed",
        )
        await self.app.repos.evaluations.create(
            evaluation_id=BASELINE_EVALUATION_ID,
            project_id=self.project.id,
            created_in_session_id=self.session_id,
            title="Baseline train.py measurement",
            summary="Run the project-native baseline measurement before variants.",
            associated_baseline_id=baseline.id,
            status="closed",
        )
        await self.app.repos.measurements.add(
            evaluation_id=BASELINE_EVALUATION_ID,
            created_in_session_id=self.session_id,
            actor="worker",
            body=(
                "Baseline command: `python train.py`\n\n"
                "```text\n"
                "component: baseline\n"
                "val_bpb: 2.713\n"
                "train_time_s: 0.18\n"
                "status: ok\n"
                "```\n\n"
                "Interpretation: baseline evidence is available; lower "
                "val_bpb is better."
            ),
            payload={},
        )
        await self.app.repos.evaluation_activities.add(
            evaluation_id=BASELINE_EVALUATION_ID,
            created_in_session_id=self.session_id,
            actor="worker",
            kind="result",
            body=(
                "Baseline command: `python train.py`\n\n"
                "```text\n"
                "component: baseline\n"
                "val_bpb: 2.713\n"
                "train_time_s: 0.18\n"
                "status: ok\n"
                "```\n\n"
                "Interpretation: baseline evidence is available; lower "
                "val_bpb is better."
            ),
            payload={},
        )


def _initial_plan_title(seed: AppSessionLoopSeed) -> str:
    if seed == "with_baseline_result":
        return "Plan candidate after existing baseline"
    if seed == "with_baseline_no_hypothesis":
        return "Plan researcher handoff after baseline"
    return "Plan first research pass"


def _initial_plan_content(seed: AppSessionLoopSeed) -> str:
    if seed == "with_baseline_result":
        return (
            "Baseline evidence already exists. File one focused Scientist "
            "experiment task to try component_a by changing only train.py, "
            "running python train.py, creating experiment/evaluation records, "
            "recording raw output evidence, and confirming prepare.py remains "
            "unchanged. When calling create_task, set "
            "base_selector='selected_checkout' for the experiment task; do not "
            "put symbolic labels in base_commit."
        )
    if seed == "with_baseline_no_hypothesis":
        return (
            "Baseline evidence already exists, but the project has no durable "
            "analyses or hypotheses yet. First file exactly one Researcher "
            "research task to inspect README.md, program.md, train.py, and "
            "prepare.py; create an Analysis titled 'Component A research map'; "
            "create a testable Hypothesis titled 'Component A lowers val_bpb'; "
            "link the task to the produced records; and mark the task done. "
            "Do not file a Scientist experiment task until the Researcher task "
            "has completed. After that Researcher handoff exists, the loop "
            "should plan and run a Scientist component_a train.py-only "
            "experiment."
        )
    return (
        "Read the project objective, research context, empty project state, and "
        "task board. Since no baseline evidence exists, file exactly one "
        "BASELINE Scientist task first. Do not file a candidate experiment in "
        "this first planning pass. After baseline evidence exists, the loop "
        "should continue and plan a component_a train.py-only candidate "
        "experiment rather than stopping."
    )


def _run_git(cwd: Path, *args: str) -> None:
    subprocess.run(
        ["git", *args],
        cwd=cwd,
        text=True,
        capture_output=True,
        check=True,
    )
