from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class ExperimentWorktree:
    base_commit: str
    git_root: Path
    worktree_root: Path
    workspace_path: Path


@dataclass(frozen=True, slots=True)
class WorktreeState:
    workspace: str
    git_root: str
    commit: str | None
    dirty: bool
    changes: list[dict[str, str]]

    def model_dump(self) -> dict[str, object]:
        return {
            "workspace": self.workspace,
            "git_root": self.git_root,
            "commit": self.commit,
            "dirty": self.dirty,
            "changes": self.changes,
        }


def require_clean_if_git_workspace(workspace_path: Path, *, action: str) -> None:
    git_root = _git_root_or_none(workspace_path.resolve())
    if git_root is None:
        return
    _require_clean_git_root(git_root, action=action)


class WorktreeManager:
    def __init__(self, *, workspace_path: Path, worktrees_dir: Path) -> None:
        self.workspace_path = workspace_path.resolve()
        self.worktrees_dir = worktrees_dir

    def prepare(
        self,
        *,
        experiment_id: str,
        existing_worktree_path: str | None = None,
        existing_base_commit: str | None = None,
    ) -> ExperimentWorktree:
        git_root = self._git_root(self.workspace_path)
        relative_workspace = self._relative_workspace(git_root)
        _require_clean_git_root(git_root, action="starting an isolated experiment")

        base_commit = existing_base_commit or self._git_text(git_root, "rev-parse", "HEAD")
        if not base_commit:
            raise RuntimeError("could not resolve git HEAD for experiment worktree")

        worktree_root = (
            self._existing_worktree_root(existing_worktree_path)
            if existing_worktree_path is not None
            else (self.worktrees_dir / experiment_id).resolve()
        )
        if worktree_root.exists():
            self._require_existing_worktree(worktree_root)
        else:
            worktree_root.parent.mkdir(parents=True, exist_ok=True)
            self._run_git(
                git_root,
                "worktree",
                "add",
                "--detach",
                str(worktree_root),
                base_commit,
            )

        return ExperimentWorktree(
            base_commit=base_commit,
            git_root=git_root,
            worktree_root=worktree_root,
            workspace_path=worktree_root / relative_workspace,
        )

    def inspect(self, workspace_path: Path) -> WorktreeState:
        workspace = workspace_path.resolve()
        git_root = self._git_root(workspace)
        commit = self._git_text(workspace, "rev-parse", "--short=12", "HEAD") or None
        changes = [
            _parse_status_line(line)
            for line in self._git_lines(
                workspace,
                "status",
                "--porcelain=v1",
                "--untracked-files=all",
            )
        ]
        return WorktreeState(
            workspace=str(workspace),
            git_root=str(git_root),
            commit=commit,
            dirty=bool(changes),
            changes=changes,
        )

    def _relative_workspace(self, git_root: Path) -> Path:
        try:
            return self.workspace_path.relative_to(git_root)
        except ValueError:
            return Path(".")

    def _existing_worktree_root(self, existing_worktree_path: str) -> Path:
        existing = Path(existing_worktree_path).expanduser().resolve()
        if not existing.exists():
            raise RuntimeError(
                f"experiment worktree path does not exist: {existing}"
            )
        return self._git_root(existing)

    def _require_existing_worktree(self, worktree_root: Path) -> None:
        result = self._git_output(worktree_root, "rev-parse", "--show-toplevel")
        if result.returncode != 0:
            raise RuntimeError(
                f"experiment worktree path already exists but is not a git worktree: "
                f"{worktree_root}"
            )

    def _git_root(self, cwd: Path) -> Path:
        git_root = self._git_text(cwd, "rev-parse", "--show-toplevel")
        if not git_root:
            raise RuntimeError(f"workspace is not a git repository: {cwd}")
        return Path(git_root).resolve()

    def _run_git(self, cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
        result = self._git_output(cwd, *args)
        if result.returncode != 0:
            error = result.stderr.strip() or result.stdout.strip()
            raise RuntimeError(f"git {' '.join(args)} failed: {error}")
        return result

    def _git_text(self, cwd: Path, *args: str) -> str:
        result = self._git_output(cwd, *args)
        if result.returncode != 0:
            return ""
        return result.stdout.strip()

    def _git_lines(self, cwd: Path, *args: str) -> list[str]:
        result = self._git_output(cwd, *args)
        if result.returncode != 0:
            return []
        return result.stdout.splitlines()

    def _git_output(self, cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
        return _git_output(cwd, *args)


def _require_clean_git_root(git_root: Path, *, action: str) -> None:
    dirty_lines = _git_lines(
        git_root,
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
    )
    if not dirty_lines:
        return

    preview = "\n".join(f"  {line}" for line in dirty_lines[:12])
    omitted = len(dirty_lines) - 12
    if omitted > 0:
        preview = f"{preview}\n  ... and {omitted} more"
    raise RuntimeError(
        "workspace must be clean before "
        f"{action}; commit, stash, or remove untracked changes first\n"
        f"Git root: {git_root}\n"
        f"Dirty paths:\n{preview}"
    )


def _git_root_or_none(cwd: Path) -> Path | None:
    git_root = _git_text(cwd, "rev-parse", "--show-toplevel")
    return Path(git_root).resolve() if git_root else None


def _git_text(cwd: Path, *args: str) -> str:
    result = _git_output(cwd, *args)
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def _git_lines(cwd: Path, *args: str) -> list[str]:
    result = _git_output(cwd, *args)
    if result.returncode != 0:
        return []
    return result.stdout.splitlines()


def _git_output(cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=cwd,
        text=True,
        capture_output=True,
        check=False,
    )


def _parse_status_line(line: str) -> dict[str, str]:
    status = line[:2]
    path = line[3:]
    if " -> " in path:
        old_path, path = path.split(" -> ", 1)
        return {"status": status, "path": path, "old_path": old_path}
    return {"status": status, "path": path}
