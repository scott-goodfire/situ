from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Generic, TypeVar, cast

from .base import BaseSituTool, ResultT
from .deps import SituToolDeps

DepsT = TypeVar("DepsT", bound=SituToolDeps)


@dataclass(slots=True)
class _DirectSituToolContext(Generic[DepsT]):
    deps: DepsT


async def invoke_situ_tool(
    *,
    tool: BaseSituTool[DepsT, ResultT],
    deps: DepsT,
    **kwargs: Any,
) -> ResultT:
    return await tool._execute_with_error_handling(
        ctx=cast(Any, _DirectSituToolContext(deps=deps)),
        **kwargs,
    )


def invoke_situ_tool_sync(
    *,
    tool: BaseSituTool[DepsT, ResultT],
    deps: DepsT,
    **kwargs: Any,
) -> ResultT:
    return asyncio.run(invoke_situ_tool(tool=tool, deps=deps, **kwargs))
