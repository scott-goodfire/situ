from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from situ.harness.app import HarnessApp
from situ.harness.core.worktrees import WorktreeManager
from situ.harness.records import AgentKind, TaskKind
from situ.harness.tools.tasks.eligibility import eligible_task_kinds_for_agent


def _git(cwd: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=cwd,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def _commit(cwd: Path, message: str) -> None:
    _git(
        cwd,
        "-c",
        "user.email=situ@example.test",
        "-c",
        "user.name=Situ Test",
        "commit",
        "-m",
        message,
    )


def _repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init")
    (repo / "pkg").mkdir()
    (repo / "pkg" / "module.py").write_text("VALUE = 1\n")
    (repo / "situ_worker.py").write_text("# worker placeholder\n")
    _git(repo, "add", ".")
    _commit(repo, "initial")
    return repo


def test_worktree_manager_creates_detached_worktree_for_clean_repo(
    tmp_path: Path,
) -> None:
    repo = _repo(tmp_path)
    base_commit = _git(repo, "rev-parse", "HEAD")

    worktree = WorktreeManager(
        workspace_path=repo / "pkg",
        worktrees_dir=tmp_path / "worktrees",
    ).prepare(experiment_id="exp_0001")

    assert worktree.base_commit == base_commit
    assert worktree.workspace_path == worktree.worktree_root / "pkg"
    assert (worktree.workspace_path / "module.py").read_text() == "VALUE = 1\n"
    assert _git(worktree.worktree_root, "branch", "--show-current") == ""


def test_worktree_manager_reuses_nested_workspace_path_without_double_append(
    tmp_path: Path,
) -> None:
    repo = _repo(tmp_path)

    first = WorktreeManager(
        workspace_path=repo / "pkg",
        worktrees_dir=tmp_path / "worktrees",
    ).prepare(experiment_id="exp_0001")
    second = WorktreeManager(
        workspace_path=repo / "pkg",
        worktrees_dir=tmp_path / "worktrees",
    ).prepare(
        experiment_id="exp_0001",
        existing_worktree_path=str(first.workspace_path),
        existing_base_commit=first.base_commit,
    )

    assert second.worktree_root == first.worktree_root
    assert second.workspace_path == first.workspace_path
    assert second.workspace_path.exists()


def test_worktree_manager_rejects_dirty_base_repo(tmp_path: Path) -> None:
    repo = _repo(tmp_path)
    (repo / "untracked.txt").write_text("dirty\n")

    with pytest.raises(RuntimeError, match="workspace must be clean"):
        WorktreeManager(
            workspace_path=repo,
            worktrees_dir=tmp_path / "worktrees",
        ).prepare(experiment_id="exp_0001")


def test_worktree_manager_inspect_preserves_unstaged_status_paths(tmp_path: Path) -> None:
    repo = _repo(tmp_path)
    (repo / "pkg" / "module.py").write_text("VALUE = 2\n")

    state = WorktreeManager(
        workspace_path=repo / "pkg",
        worktrees_dir=tmp_path / "worktrees",
    ).inspect(repo / "pkg")

    assert state.changes == [{"status": " M", "path": "pkg/module.py"}]


def test_harness_prepares_experiment_task_checkout_and_records_final_state(
    tmp_path: Path,
) -> None:
    repo = _repo(tmp_path)
    app = HarnessApp(
        repo,
        notify=lambda _method, _params: None,
        project_home=tmp_path / "situ-home",
    )
    workspace = app.repos.workspaces.ensure()
    project = app.repos.projects.create(
        project_id="project_0001",
        workspace_id=workspace.id,
        title="Try candidate",
        objective="Improve the checked value.",
        research_context="Run the local checks.",
    )
    session = app.repos.sessions.create(
        "session_0001",
        workspace_id=workspace.id,
        project_id=project.id,
    )
    scientist = app.repos.agents.ensure_project_agent(
        project_id=project.id,
        created_in_session_id=session.id,
        kind=AgentKind.SCIENTIST,
        display_name="Scientist",
    )
    task = app.repos.tasks.create(
        task_id="task_project_0001_001",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Try candidate edit",
        content="Change module.py and run the local check.",
        kind=TaskKind.EXPERIMENT,
        source_kind="manager",
    )
    claimed = app.repos.tasks.claim(
        task_id=task.id,
        agent_id=scientist.id,
        eligible_kinds=eligible_task_kinds_for_agent(AgentKind.SCIENTIST),
        claimed_in_session_id=session.id,
    )
    assert claimed is not None

    prepared = app._prepare_experiment_task(
        task=claimed,
        session_id=session.id,
        workspace_repo_path=workspace.repo_path,
    )

    assert prepared.repo_path != workspace.repo_path
    assert Path(prepared.repo_path).is_dir()
    assert prepared.task.payload["experiment_id"] == prepared.experiment.id
    assert prepared.task.payload["worktree_path"] == prepared.repo_path
    assert prepared.experiment.worktree_path == prepared.repo_path
    assert prepared.experiment.base_commit == _git(repo, "rev-parse", "HEAD")
    assert app.repos.task_entity_links.get(
        task.id,
        "experiment",
        prepared.experiment.id,
        "produces",
    )

    (Path(prepared.repo_path) / "pkg" / "module.py").write_text("VALUE = 2\n")
    assert (repo / "pkg" / "module.py").read_text() == "VALUE = 1\n"

    app._complete_experiment_task(
        experiment_id=prepared.experiment.id,
        session_id=session.id,
        workspace_repo_path=workspace.repo_path,
    )

    completed = app.repos.experiments.get(prepared.experiment.id)
    assert completed is not None
    assert completed.status == "closed"
    activities = app.repos.experiment_activities.list_for_experiment(completed.id)
    assert activities[-1].payload["activity_type"] == "workspace_state"
    assert activities[-1].payload["worktree"]["dirty"] is True
