from __future__ import annotations

import asyncio
from collections.abc import Mapping, Sequence
from pathlib import Path


async def run_process(
    argv: Sequence[str],
    *,
    cwd: Path | None = None,
    env: Mapping[str, str] | None = None,
) -> int:
    process = await asyncio.create_subprocess_exec(
        *argv,
        cwd=cwd,
        env=dict(env) if env is not None else None,
    )
    return await process.wait()
