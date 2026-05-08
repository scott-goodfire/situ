from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class GitResult:
    returncode: int
    stdout: str
    stderr: str


async def git_output(cwd: Path, *args: str) -> GitResult:
    try:
        process = await asyncio.create_subprocess_exec(
            "git",
            *args,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    except OSError as error:
        return GitResult(returncode=127, stdout="", stderr=str(error))

    stdout, stderr = await process.communicate()
    return GitResult(
        returncode=process.returncode if process.returncode is not None else 0,
        stdout=stdout.decode(errors="replace"),
        stderr=stderr.decode(errors="replace"),
    )


async def run_git(cwd: Path, *args: str) -> GitResult:
    result = await git_output(cwd, *args)
    if result.returncode != 0:
        error = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"git {' '.join(args)} failed: {error}")
    return result


async def git_stdout(cwd: Path, *args: str) -> str:
    return (await run_git(cwd, *args)).stdout


async def git_text(cwd: Path, *args: str) -> str:
    result = await git_output(cwd, *args)
    return result.stdout.strip() if result.returncode == 0 else ""


async def git_lines(cwd: Path, *args: str) -> list[str]:
    result = await git_output(cwd, *args)
    if result.returncode != 0:
        return []
    return result.stdout.splitlines()


async def git_root(cwd: Path) -> Path:
    root = await git_text(cwd, "rev-parse", "--show-toplevel")
    if not root:
        raise RuntimeError(f"workspace is not a git repository: {cwd}")
    return Path(root).resolve()


async def git_root_or_none(cwd: Path) -> Path | None:
    root = await git_text(cwd, "rev-parse", "--show-toplevel")
    return Path(root).resolve() if root else None
