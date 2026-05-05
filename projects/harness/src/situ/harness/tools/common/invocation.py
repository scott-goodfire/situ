from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Generic, TypeVar, cast

from .base import BaseSituTool, ResultT
from .deps import SituToolDeps

DepsT = TypeVar("DepsT", bound=SituToolDeps)


@dataclass(slots=True)
class _DirectSituToolContext(Generic[DepsT]):
    deps: DepsT


def invoke_situ_tool_sync(
    *,
    tool: BaseSituTool[DepsT, ResultT],
    deps: DepsT,
    **kwargs: Any,
) -> ResultT:
    return tool._execute_with_error_handling(
        ctx=cast(Any, _DirectSituToolContext(deps=deps)),
        **kwargs,
    )
