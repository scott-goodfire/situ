from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import InspectWorkspaceState

GENERATED_PARTS = {
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    "__pycache__",
    "build",
    "dist",
    "node_modules",
}

DEPENDENCY_FILES = {
    "bun.lock",
    "package-lock.json",
    "package.json",
    "pnpm-lock.yaml",
    "poetry.lock",
    "pyproject.toml",
    "requirements.txt",
    "requirements-dev.txt",
    "setup.cfg",
    "setup.py",
    "uv.lock",
    "yarn.lock",
}


class InspectWorkspaceStateTool(
    BaseSituTool[SituToolDeps, InspectWorkspaceState]
):
    name = "inspect_workspace_state"
    result_type = InspectWorkspaceState

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        eval_command: str | None = None,
        **_kwargs: Any,
    ) -> InspectWorkspaceState:
        """Inspect git state and coarse changed-file categories for comparability."""
        if ctx.deps.repo_path is None:
            return self._failure(
                code="missing_repo_path",
                message="inspect_workspace_state requires a workspace repo_path.",
            )

        repo_path = Path(ctx.deps.repo_path).resolve()
        git_root = await _git_output(repo_path, "rev-parse", "--show-toplevel")
        if git_root.returncode != 0:
            return InspectWorkspaceState(
                success=True,
                workspace_state={
                    "workspace": str(repo_path),
                    "is_git_repo": False,
                    "eval_command": eval_command,
                    "concerns": ["Workspace is not a git repository."],
                },
            )

        branch = await _git_text(repo_path, "branch", "--show-current")
        commit = await _git_text(repo_path, "rev-parse", "--short=12", "HEAD")
        status_lines = await _git_lines(repo_path, "status", "--porcelain=v1")
        changes = [_parse_status_line(line) for line in status_lines]
        categories = _category_counts(changes)
        concerns = _concerns(changes, categories)

        return InspectWorkspaceState(
            success=True,
            workspace_state={
                "workspace": str(repo_path),
                "git_root": git_root.stdout.strip(),
                "is_git_repo": True,
                "branch": branch or None,
                "commit": commit or None,
                "dirty": bool(changes),
                "eval_command": eval_command,
                "changes": changes,
                "category_counts": categories,
                "concerns": concerns,
            },
        )


@dataclass(frozen=True, slots=True)
class _GitResult:
    returncode: int
    stdout: str
    stderr: str


async def _git_output(repo_path: Path, *args: str) -> _GitResult:
    try:
        process = await asyncio.create_subprocess_exec(
            "git",
            *args,
            cwd=repo_path,
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


async def _git_text(repo_path: Path, *args: str) -> str:
    result = await _git_output(repo_path, *args)
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


async def _git_lines(repo_path: Path, *args: str) -> list[str]:
    output = await _git_text(repo_path, *args)
    if not output:
        return []
    return output.splitlines()


def _parse_status_line(line: str) -> dict[str, str]:
    status = line[:2]
    path = line[3:]
    if " -> " in path:
        _old_path, path = path.split(" -> ", 1)
    return {
        "status": status,
        "path": path,
        "category": _classify_path(path),
    }


def _classify_path(path: str) -> str:
    normalized = path.replace("\\", "/")
    parts = normalized.split("/")
    name = parts[-1]

    if any(part in GENERATED_PARTS for part in parts):
        return "generated"
    if name in DEPENDENCY_FILES or name.endswith((".lock", ".toml")):
        return "dependency"
    if _is_test_or_eval_path(parts, name):
        return "test_or_eval"
    if name.startswith("."):
        return "config"
    return "source"


def _is_test_or_eval_path(parts: list[str], name: str) -> bool:
    test_or_eval_parts = {
        "test",
        "tests",
        "eval",
        "evals",
        "bench",
        "benchmarks",
        "fixtures",
    }
    if any(part in test_or_eval_parts for part in parts):
        return True
    return name.startswith(("test_", "eval_", "benchmark_")) or name.endswith(
        ("_test.py", "_eval.py", "_benchmark.py")
    )


def _category_counts(changes: list[dict[str, str]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for change in changes:
        category = change["category"]
        counts[category] = counts.get(category, 0) + 1
    return counts


def _concerns(
    changes: list[dict[str, str]],
    categories: dict[str, int],
) -> list[str]:
    concerns: list[str] = []
    if changes:
        concerns.append("Workspace has uncommitted changes.")
    if categories.get("test_or_eval", 0) > 0:
        concerns.append(
            "Candidate changes include tests, evals, benchmarks, or fixtures."
        )
    if categories.get("dependency", 0) > 0:
        concerns.append("Candidate changes include dependency or toolchain files.")
    if categories.get("generated", 0) > 0:
        concerns.append("Candidate changes include generated or cache files.")
    return concerns
