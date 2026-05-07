from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from ....core.db import Database
from ....core.paths import resolve_workspace
from ....core.project_context import ProjectContext
from ....repositories import Repositories


def run(args: argparse.Namespace) -> int:
    context = ProjectContext(resolve_workspace(Path.cwd(), args.workspace))
    db = Database(
        context.database_path,
        workspace_id=context.workspace_id,
        repo_path=str(context.repo_root),
    )
    repos = Repositories.create(db)
    artifact = repos.artifacts.get(artifact_id=args.artifact_id)
    if artifact is None or artifact.kind != "patch":
        print(f"patch artifact not found: {args.artifact_id}", file=sys.stderr)
        return 1

    patch_path = _resolve_artifact_path(
        project_dir=context.project_dir,
        artifact_path=artifact.path,
    )
    if not patch_path.is_file():
        print(f"patch file not found: {patch_path}", file=sys.stderr)
        return 1

    git_root = _git_text(context.repo_root, "rev-parse", "--show-toplevel")
    if not git_root:
        print(f"workspace is not a git repository: {context.repo_root}", file=sys.stderr)
        return 1
    git_root_path = Path(git_root)

    dirty_paths = _git_lines(
        git_root_path,
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
    )
    if dirty_paths and not args.force:
        print(
            "refusing to apply patch to a dirty checkout; commit, stash, or "
            "rerun with --force",
            file=sys.stderr,
        )
        for line in dirty_paths[:12]:
            print(f"  {line}", file=sys.stderr)
        return 1

    if args.branch is not None:
        branch = args.branch or f"situ/apply/{artifact.id.lower()}"
        if _run_git(git_root_path, "checkout", "-b", branch) != 0:
            return 1

    base_commit = _base_commit_for_patch(repos, artifact.id)
    current_commit = _git_text(git_root_path, "rev-parse", "HEAD")
    if base_commit and current_commit and base_commit != current_commit:
        print(
            f"warning: patch base {base_commit[:12]} differs from current "
            f"HEAD {current_commit[:12]}; applying with --3way",
            file=sys.stderr,
        )

    result = subprocess.run(
        ["git", "apply", "--3way", str(patch_path)],
        cwd=git_root_path,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr or result.stdout)
        return result.returncode

    print(f"Applied {artifact.id} to {git_root_path}")
    return 0


def _resolve_artifact_path(*, project_dir: Path, artifact_path: str) -> Path:
    path = Path(artifact_path)
    return path if path.is_absolute() else project_dir / path


def _base_commit_for_patch(repos: Repositories, artifact_id: str) -> str | None:
    for activity in repos.experiment_activities.list_all():
        payload = activity.payload or {}
        if (
            payload.get("activity_type") == "patch_handoff"
            and payload.get("artifact_id") == artifact_id
        ):
            base_commit = payload.get("base_commit")
            return base_commit if isinstance(base_commit, str) else None
    return None


def _run_git(cwd: Path, *args: str) -> int:
    result = subprocess.run(["git", *args], cwd=cwd, text=True)
    return result.returncode


def _git_text(cwd: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=cwd,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else ""


def _git_lines(cwd: Path, *args: str) -> list[str]:
    text = _git_text(cwd, *args)
    return text.splitlines() if text else []
