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
    ).prepare(experiment_id="EX1")

    assert worktree.base_commit == base_commit
    assert worktree.workspace_path == worktree.worktree_root / "pkg"
    assert (worktree.workspace_path / "module.py").read_text() == "VALUE = 1\n"
    assert _git(worktree.worktree_root, "branch", "--show-current") == ""


def test_worktree_manager_can_prepare_from_selected_base_commit(
    tmp_path: Path,
) -> None:
    repo = _repo(tmp_path)
    first_commit = _git(repo, "rev-parse", "HEAD")
    (repo / "pkg" / "module.py").write_text("VALUE = 2\n")
    _git(repo, "add", ".")
    _commit(repo, "second")

    worktree = WorktreeManager(
        workspace_path=repo / "pkg",
        worktrees_dir=tmp_path / "worktrees",
    ).prepare(
        experiment_id="EX1",
        requested_base_commit=first_commit,
    )

    assert worktree.base_commit == first_commit
    assert (worktree.workspace_path / "module.py").read_text() == "VALUE = 1\n"


def test_worktree_manager_captures_candidate_commit_and_ref(
    tmp_path: Path,
) -> None:
    repo = _repo(tmp_path)
    base_commit = _git(repo, "rev-parse", "HEAD")
    worktree = WorktreeManager(
        workspace_path=repo / "pkg",
        worktrees_dir=tmp_path / "worktrees",
    ).prepare(experiment_id="EX1")
    (worktree.workspace_path / "module.py").write_text("VALUE = 2\n")

    candidate = WorktreeManager(
        workspace_path=repo / "pkg",
        worktrees_dir=tmp_path / "worktrees",
    ).capture_candidate_state(
        worktree.workspace_path,
        experiment_id="EX1",
        base_commit=base_commit,
    )

    assert candidate.worktree.dirty is True
    assert candidate.candidate_commit is not None
    assert candidate.candidate_ref == "refs/situ/experiments/EX1"
    assert candidate.post_commit_worktree.dirty is False
    assert _git(repo, "rev-parse", "refs/situ/experiments/EX1") == candidate.candidate_commit


def test_worktree_manager_reuses_nested_workspace_path_without_double_append(
    tmp_path: Path,
) -> None:
    repo = _repo(tmp_path)

    first = WorktreeManager(
        workspace_path=repo / "pkg",
        worktrees_dir=tmp_path / "worktrees",
    ).prepare(experiment_id="EX1")
    second = WorktreeManager(
        workspace_path=repo / "pkg",
        worktrees_dir=tmp_path / "worktrees",
    ).prepare(
        experiment_id="EX1",
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
        ).prepare(experiment_id="EX1")


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
        project_id="P1",
        workspace_id=workspace.id,
        title="Try candidate",
        objective="Improve the checked value.",
        research_context="Run the local checks.",
    )
    session = app.repos.sessions.create(
        session_id="S1",
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
        task_id="T1",
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
        task_id=task.id,
        entity_kind="experiment",
        entity_id=prepared.experiment.id,
        relationship="produces",
    )

    (Path(prepared.repo_path) / "pkg" / "module.py").write_text("VALUE = 2\n")
    assert (repo / "pkg" / "module.py").read_text() == "VALUE = 1\n"

    app._complete_experiment_task(
        experiment_id=prepared.experiment.id,
        session_id=session.id,
        workspace_repo_path=workspace.repo_path,
    )

    completed = app.repos.experiments.get(experiment_id=prepared.experiment.id)
    assert completed is not None
    assert completed.status == "closed"
    assert completed.candidate_commit is not None
    assert _git(repo, "rev-parse", "refs/situ/experiments/EX1") == completed.candidate_commit
    activities = app.repos.experiment_activities.list_for_experiment(experiment_id=completed.id)
    assert activities[-1].payload["activity_type"] == "workspace_state"
    assert activities[-1].payload["worktree"]["dirty"] is True
    assert activities[-1].payload["candidate_commit"] == completed.candidate_commit
    assert activities[-1].payload["post_commit_worktree"]["dirty"] is False
    patch_artifacts = [
        artifact
        for artifact in app.repos.artifacts.list_for_project(project_id=project.id)
        if artifact.kind == "patch"
    ]
    assert len(patch_artifacts) == 1
    assert activities[-1].payload["patch_artifact_id"] == patch_artifacts[0].id
    patch_path = app.context.project_dir / patch_artifacts[0].path
    patch_text = patch_path.read_text(encoding="utf-8")
    assert "VALUE = 2" in patch_text
    patch_activities = [
        activity
        for activity in activities
        if activity.payload.get("activity_type") == "patch_handoff"
    ]
    assert len(patch_activities) == 1
    assert patch_activities[0].payload["artifact_id"] == patch_artifacts[0].id
    assert patch_activities[0].payload["changed_files"] == ["pkg/module.py"]
    assert app.repos.task_entity_links.get(
        task_id=task.id,
        entity_kind="artifact",
        entity_id=patch_artifacts[0].id,
        relationship="produces",
    )

    followup = app.repos.tasks.create(
        task_id="T2",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Continue candidate edit",
        content="Build from the accepted component edit.",
        kind=TaskKind.EXPERIMENT,
        source_kind="manager",
        payload={
            "parent_experiment_id": completed.id,
            "research_thread": "optimizer",
        },
    )
    claimed_followup = app.repos.tasks.claim(
        task_id=followup.id,
        agent_id=scientist.id,
        eligible_kinds=eligible_task_kinds_for_agent(AgentKind.SCIENTIST),
        claimed_in_session_id=session.id,
    )
    assert claimed_followup is not None

    prepared_followup = app._prepare_experiment_task(
        task=claimed_followup,
        session_id=session.id,
        workspace_repo_path=workspace.repo_path,
    )

    assert prepared_followup.experiment.parent_experiment_id == completed.id
    assert prepared_followup.experiment.research_thread == "optimizer"
    assert prepared_followup.experiment.base_commit == completed.candidate_commit
    assert (Path(prepared_followup.repo_path) / "pkg" / "module.py").read_text() == "VALUE = 2\n"


def test_review_tasks_are_claimed_by_critic_not_researcher() -> None:
    assert TaskKind.REVIEW not in eligible_task_kinds_for_agent(AgentKind.RESEARCHER)
    assert eligible_task_kinds_for_agent(AgentKind.CRITIC) == (TaskKind.REVIEW,)
