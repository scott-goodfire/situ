from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

from situ.harness.app import HarnessApp
from situ.harness.core.dbos.runtime import reset_dbos_for_tests

from evals.harness.models import EvalEvent
from evals.worlds.app_session_loop.models import (
    AppSessionLoopEvalInput,
    AppSessionLoopSeed,
)
from evals.worlds.repo_bootstrap.world.world import (
    BASELINE_EVALUATION_ID,
    FIXTURE_FILES,
    HYPOTHESIS_ID,
)

SESSION_ID = "session_app_loop_0001"


class AppSessionLoopWorld:
    def __init__(self, args: AppSessionLoopEvalInput) -> None:
        self.args = args
        self._tmp = TemporaryDirectory()
        self.root = Path(self._tmp.name)
        self.workspace_path = self.root / "fixture-repo"
        self.workspace_path.mkdir(parents=True)
        self._write_fixture_repo()

        self.app = HarnessApp(
            self.workspace_path,
            app_root=Path.cwd(),
            project_home=self.root / "home",
            notify=lambda _method, _params: None,
        )
        self.session_id = SESSION_ID
        self.workspace = self.app.repos.workspaces.ensure()
        self.project = self.app.repos.projects.create(
            project_id=self.app.repos.projects.next_id(self.workspace.id),
            workspace_id=self.workspace.id,
            title="Improve validation bits per byte",
            objective=args.objective,
            research_context=args.research_context,
        )
        self.session = self.app.repos.sessions.create(
            self.session_id,
            workspace_id=self.workspace.id,
            project_id=self.project.id,
        )
        self.app._session_setup[self.session_id] = {
            "objective": self.project.objective,
            "research_context": self.project.research_context,
        }
        self.app._ensure_project_agents(
            session_id=self.session_id,
            project_id=self.project.id,
        )
        self._seed(args.seed)
        self.app._enqueue_plan_task(
            session_id=self.session_id,
            project_id=self.project.id,
            title=_initial_plan_title(args.seed),
            content=_initial_plan_content(args.seed),
            source_kind="system",
        )

    def run(self) -> None:
        self.app._execute_session(
            self.session_id,
            max_experiments=self.args.max_experiments,
        )

    def teardown(self) -> None:
        try:
            reset_dbos_for_tests()
        finally:
            self._tmp.cleanup()

    def session_graph(self) -> dict[str, Any]:
        return self.app.sessions_api.get_session(self.session_id).model_dump(mode="json")

    def events(self) -> list[EvalEvent]:
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
            for event in self.app.repos.events.list_for_session(self.session_id)
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

    def _seed(self, seed: AppSessionLoopSeed) -> None:
        if seed != "with_baseline_result":
            return
        self.app.repos.hypotheses.create(
            hypothesis_id=HYPOTHESIS_ID,
            project_id=self.project.id,
            created_in_session_id=self.session_id,
            title="Train.py variants can improve val_bpb",
            summary="Try narrow train.py variants and compare against baseline.",
            status="active",
        )
        self.app.repos.evaluations.create(
            evaluation_id=BASELINE_EVALUATION_ID,
            project_id=self.project.id,
            created_in_session_id=self.session_id,
            title="Baseline train.py measurement",
            summary="Run the project-native baseline measurement before variants.",
            status="closed",
        )
        self.app.repos.evaluation_activities.add(
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
    return "Plan first research pass"


def _initial_plan_content(seed: AppSessionLoopSeed) -> str:
    if seed == "with_baseline_result":
        return (
            "Baseline evidence already exists. File one focused Scientist "
            "experiment task to try component_a by changing only train.py, "
            "running python train.py, creating experiment/evaluation records, "
            "recording raw output evidence, and confirming prepare.py remains "
            "unchanged."
        )
    return (
        "Read the project objective, research context, empty ledger state, and "
        "task board. Since no baseline evidence exists, file exactly one "
        "BASELINE Scientist task first. Do not file a candidate experiment in "
        "this first planning pass. After baseline evidence exists, the loop "
        "should continue and plan a component_a train.py-only candidate "
        "experiment rather than stopping."
    )
