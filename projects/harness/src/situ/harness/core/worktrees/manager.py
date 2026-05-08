from __future__ import annotations

import asyncio
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


@dataclass(frozen=True, slots=True)
class CandidateState:
    worktree: WorktreeState
    candidate_commit: str | None
    candidate_ref: str | None
    post_commit_worktree: WorktreeState


@dataclass(frozen=True, slots=True)
class _GitResult:
    returncode: int
    stdout: str
    stderr: str


async def require_clean_if_git_workspace(workspace_path: Path, *, action: str) -> None:
    git_root = await _git_root_or_none(workspace_path.resolve())
    if git_root is None:
        return
    await _require_clean_git_root(git_root, action=action)


class WorktreeManager:
    def __init__(self, *, workspace_path: Path, worktrees_dir: Path) -> None:
        self.workspace_path = workspace_path.resolve()
        self.worktrees_dir = worktrees_dir

    async def prepare(
        self,
        *,
        experiment_id: str,
        existing_worktree_path: str | None = None,
        existing_base_commit: str | None = None,
        requested_base_commit: str | None = None,
    ) -> ExperimentWorktree:
        git_root = await self._git_root(self.workspace_path)
        relative_workspace = self._relative_workspace(git_root)
        await _require_clean_git_root(git_root, action="starting an isolated experiment")

        base_commit = existing_base_commit or requested_base_commit
        if base_commit is None:
            base_commit = await self._git_text(git_root, "rev-parse", "HEAD")
        if not base_commit:
            raise RuntimeError("could not resolve git HEAD for experiment worktree")
        resolved_base_commit = await self._git_text(git_root, "rev-parse", base_commit)
        if not resolved_base_commit:
            raise RuntimeError(f"could not resolve base commit for experiment: {base_commit}")

        worktree_root = (
            await self._existing_worktree_root(existing_worktree_path)
            if existing_worktree_path is not None
            else (self.worktrees_dir / experiment_id).resolve()
        )
        if worktree_root.exists():
            await self._require_existing_worktree(worktree_root)
        else:
            worktree_root.parent.mkdir(parents=True, exist_ok=True)
            # Prune stale registrations whose directories were deleted out
            # of band (e.g. by `situ clear` or manual cleanup). Without this,
            # `git worktree add` fails with "missing but already registered"
            # if the same path was used by a previous run.
            await self._git_output(git_root, "worktree", "prune")
            await self._run_git(
                git_root,
                "worktree",
                "add",
                "--detach",
                str(worktree_root),
                resolved_base_commit,
            )

        return ExperimentWorktree(
            base_commit=resolved_base_commit,
            git_root=git_root,
            worktree_root=worktree_root,
            workspace_path=worktree_root / relative_workspace,
        )

    async def inspect(self, workspace_path: Path) -> WorktreeState:
        workspace = workspace_path.resolve()
        git_root = await self._git_root(workspace)
        commit = await self._git_text(workspace, "rev-parse", "--short=12", "HEAD") or None
        status_lines = await self._git_lines(
            workspace,
            "status",
            "--porcelain=v1",
            "--untracked-files=all",
        )
        changes = [
            _parse_status_line(line)
            for line in status_lines
        ]
        return WorktreeState(
            workspace=str(workspace),
            git_root=str(git_root),
            commit=commit,
            dirty=bool(changes),
            changes=changes,
        )

    async def capture_candidate_state(
        self,
        workspace_path: Path,
        *,
        experiment_id: str,
        base_commit: str | None,
    ) -> CandidateState:
        worktree = await self.inspect(workspace_path)
        workspace = workspace_path.resolve()

        if worktree.dirty:
            await self._run_git(workspace, "add", "-A")
            await self._run_git(
                workspace,
                "-c",
                "user.email=situ@example.local",
                "-c",
                "user.name=Situ",
                "commit",
                "-m",
                f"situ candidate {experiment_id}",
            )

        post_commit_worktree = await self.inspect(workspace_path)
        head_commit = await self._git_text(workspace, "rev-parse", "HEAD")
        resolved_base_commit = (
            await self._git_text(workspace, "rev-parse", base_commit)
            if base_commit is not None
            else ""
        )
        candidate_commit = (
            head_commit
            if head_commit and head_commit != resolved_base_commit
            else None
        )
        candidate_ref = None
        if candidate_commit is not None:
            candidate_ref = f"refs/situ/experiments/{experiment_id}"
            await self._run_git(workspace, "update-ref", candidate_ref, candidate_commit)

        return CandidateState(
            worktree=worktree,
            candidate_commit=candidate_commit,
            candidate_ref=candidate_ref,
            post_commit_worktree=post_commit_worktree,
        )

    def _relative_workspace(self, git_root: Path) -> Path:
        try:
            return self.workspace_path.relative_to(git_root)
        except ValueError:
            return Path(".")

    async def _existing_worktree_root(self, existing_worktree_path: str) -> Path:
        existing = Path(existing_worktree_path).expanduser().resolve()
        if not existing.exists():
            raise RuntimeError(
                f"experiment worktree path does not exist: {existing}"
            )
        return await self._git_root(existing)

    async def _require_existing_worktree(self, worktree_root: Path) -> None:
        result = await self._git_output(worktree_root, "rev-parse", "--show-toplevel")
        if result.returncode != 0:
            raise RuntimeError(
                f"experiment worktree path already exists but is not a git worktree: "
                f"{worktree_root}"
            )

    async def _git_root(self, cwd: Path) -> Path:
        git_root = await self._git_text(cwd, "rev-parse", "--show-toplevel")
        if not git_root:
            raise RuntimeError(f"workspace is not a git repository: {cwd}")
        return Path(git_root).resolve()

    async def _run_git(self, cwd: Path, *args: str) -> _GitResult:
        result = await self._git_output(cwd, *args)
        if result.returncode != 0:
            error = result.stderr.strip() or result.stdout.strip()
            raise RuntimeError(f"git {' '.join(args)} failed: {error}")
        return result

    async def _git_text(self, cwd: Path, *args: str) -> str:
        result = await self._git_output(cwd, *args)
        if result.returncode != 0:
            return ""
        return result.stdout.strip()

    async def _git_lines(self, cwd: Path, *args: str) -> list[str]:
        result = await self._git_output(cwd, *args)
        if result.returncode != 0:
            return []
        return result.stdout.splitlines()

    async def _git_output(self, cwd: Path, *args: str) -> _GitResult:
        return await _git_output(cwd, *args)


async def _require_clean_git_root(git_root: Path, *, action: str) -> None:
    dirty_lines = await _git_lines(
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


async def _git_root_or_none(cwd: Path) -> Path | None:
    git_root = await _git_text(cwd, "rev-parse", "--show-toplevel")
    return Path(git_root).resolve() if git_root else None


async def _git_text(cwd: Path, *args: str) -> str:
    result = await _git_output(cwd, *args)
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


async def _git_lines(cwd: Path, *args: str) -> list[str]:
    result = await _git_output(cwd, *args)
    if result.returncode != 0:
        return []
    return result.stdout.splitlines()


async def _git_output(cwd: Path, *args: str) -> _GitResult:
    try:
        process = await asyncio.create_subprocess_exec(
            "git",
            *args,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    except OSError as error:
        return _GitResult(returncode=127, stdout="", stderr=str(error))
    stdout, stderr = await process.communicate()
    return _GitResult(
        returncode=process.returncode if process.returncode is not None else 0,
        stdout=stdout.decode(errors="replace"),
        stderr=stderr.decode(errors="replace"),
    )


def _parse_status_line(line: str) -> dict[str, str]:
    status = line[:2]
    path = line[3:]
    if " -> " in path:
        old_path, path = path.split(" -> ", 1)
        return {"status": status, "path": path, "old_path": old_path}
    return {"status": status, "path": path}
