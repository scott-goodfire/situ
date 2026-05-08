from __future__ import annotations

from abc import ABC, abstractmethod
from functools import wraps
from typing import Any, ClassVar, Generic, TypeVar, cast

from pydantic import BaseModel, ConfigDict, Field
from pydantic_ai import RunContext, Tool
from pydantic_ai.messages import ToolReturn

from .deps import SituToolDeps

DepsT = TypeVar("DepsT", bound=SituToolDeps)
ResultT = TypeVar("ResultT", bound="SituToolReturn")


class SituToolErrorDetail(BaseModel):
    code: str
    message: str


class SituToolReturn(BaseModel):
    success: bool
    error: SituToolErrorDetail | None = None
    metadata: dict[str, Any] | None = Field(default=None, exclude=True)

    def as_tool_return(self) -> ToolReturn:
        return ToolReturn(return_value=self, metadata=self.metadata)


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

    async def has_permission(
        self,
        *,
        ctx: RunContext[DepsT],
        **kwargs: Any,
    ) -> bool:
        _ = (ctx, kwargs)
        return True

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
            if not await self.has_permission(ctx=ctx, **kwargs):
                return self._failure(
                    code="permission_denied",
                    message=f"Tool '{self.name}' is not allowed in this context.",
                )
            return await self.execute(ctx=ctx, **kwargs)
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
