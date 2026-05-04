from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Generic, TypeVar, cast

from .base import BaseAlmanacTool, ResultT
from .deps import AlmanacToolDeps

DepsT = TypeVar("DepsT", bound=AlmanacToolDeps)


@dataclass(slots=True)
class _DirectAlmanacToolContext(Generic[DepsT]):
    deps: DepsT


def invoke_almanac_tool_sync(
    *,
    tool: BaseAlmanacTool[DepsT, ResultT],
    deps: DepsT,
    **kwargs: Any,
) -> ResultT:
    return tool._execute_with_error_handling(
        ctx=cast(Any, _DirectAlmanacToolContext(deps=deps)),
        **kwargs,
    )
