from __future__ import annotations

from abc import ABC, abstractmethod
from enum import StrEnum
from functools import wraps
from typing import Any, ClassVar, Generic, TypeVar, cast

from pydantic import BaseModel, ConfigDict, Field
from pydantic_ai import RunContext, Tool
from pydantic_ai.messages import ToolReturn

from .deps import SituToolDeps

DepsT = TypeVar("DepsT", bound=SituToolDeps)
ResultT = TypeVar("ResultT", bound="SituToolReturn")


class ReviewTargetKind(StrEnum):
    ANALYSIS = "analysis"
    HYPOTHESIS = "hypothesis"
    BASELINE = "baseline"
    EXPERIMENT = "experiment"
    EVALUATION = "evaluation"


class SituToolPermissionDenied(Exception):
    pass


class SituToolErrorDetail(BaseModel):
    code: str
    message: str


class SituToolReturn(BaseModel):
    success: bool
    error: SituToolErrorDetail | None = None
    metadata: dict[str, Any] | None = Field(default=None, exclude=True)

    def as_tool_return(self) -> ToolReturn:
        return ToolReturn(return_value=self, metadata=self.metadata)


def ensure_active_review_target(
    *,
    ctx: RunContext[SituToolDeps],
    kind: ReviewTargetKind | str,
    record_id: str,
) -> None:
    target_kind = ctx.deps.active_review_target_kind
    target_id = ctx.deps.active_review_target_id
    if target_kind is None and target_id is None:
        return

    checked_kind = ReviewTargetKind(kind)
    target_kind_value = (
        target_kind.value if isinstance(target_kind, ReviewTargetKind) else target_kind
    )
    if target_kind_value == checked_kind.value and target_id == record_id:
        return

    owned = (
        f"{target_kind_value} {target_id}"
        if target_kind_value is not None and target_id is not None
        else "no active review target"
    )
    raise SituToolPermissionDenied(
        f"This Critic review owns {owned}; it cannot modify "
        f"{checked_kind.value} {record_id}."
    )


class BaseSituTool(BaseModel, ABC, Generic[DepsT, ResultT]):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    name: ClassVar[str]
    result_type: ClassVar[type[ResultT]]
    retries: ClassVar[int] = 2
    sequential: ClassVar[bool] = False

    def as_tool(self) -> Tool[DepsT]:
        return cast(
            Tool[DepsT],
            Tool(
                self._build_tool_function(),
                name=self.name,
                max_retries=self.retries,
                sequential=self.sequential,
            ),
        )

    @abstractmethod
    async def execute(
        self,
        *,
        ctx: RunContext[DepsT],
        **kwargs: Any,
    ) -> ResultT:
        raise NotImplementedError

    def _build_tool_function(self):
        @wraps(self.execute)
        async def tool_function(
            ctx: RunContext[DepsT],
            *args: Any,
            **kwargs: Any,
        ) -> ToolReturn:
            del args
            result = await self._execute_with_error_handling(ctx=ctx, **kwargs)
            return result.as_tool_return()

        return cast(Any, tool_function)

    async def _execute_with_error_handling(
        self,
        *,
        ctx: RunContext[DepsT],
        **kwargs: Any,
    ) -> ResultT:
        try:
            if self.sequential and not await ctx.deps.session_is_active():
                return self._failure(
                    code="session_closed",
                    message=(
                        f"Tool '{self.name}' cannot mutate state because "
                        f"session {ctx.deps.session_id} is closed."
                    ),
                )
            return await self.execute(ctx=ctx, **kwargs)
        except SituToolPermissionDenied as error:
            return self._failure(code="permission_denied", message=str(error))
        except Exception as error:
            return self._failure(
                code="tool_execution_failed",
                message=f"Tool '{self.name}' failed: {error}",
            )

    def _failure(self, *, code: str, message: str) -> ResultT:
        return self.result_type(
            success=False,
            error=SituToolErrorDetail(code=code, message=message),
        )
