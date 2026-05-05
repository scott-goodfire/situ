from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Generic, Sequence, TypeVar

from pydantic import BaseModel, ConfigDict, Field
from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage, UserContent
from pydantic_ai.run import AgentRunResult
from pydantic_ai.usage import UsageLimits

DepsT = TypeVar("DepsT")
OutputT = TypeVar("OutputT")
ContextT = TypeVar("ContextT", bound="SituAgentContext[Any]")


class SituAgentPrompt(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    instructions: str
    user_prompt: str | list[UserContent] | None


class SituAgentContext(BaseModel, Generic[DepsT]):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    deps: DepsT | None = None
    message_history: Sequence[ModelMessage] | None = None
    usage_limits: UsageLimits | None = None
    run_kwargs: dict[str, Any] = Field(default_factory=dict)


class BaseSituAgent(BaseModel, ABC, Generic[ContextT, OutputT]):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    @abstractmethod
    def generate_prompt(self, context: ContextT) -> SituAgentPrompt:
        raise NotImplementedError

    @abstractmethod
    def build_agent(
        self,
        *,
        context: ContextT,
        prompt: SituAgentPrompt,
    ) -> Agent[Any, OutputT]:
        raise NotImplementedError

    def postprocess_output(
        self,
        *,
        output: OutputT,
        context: ContextT,
        run_result: AgentRunResult[OutputT],
    ) -> OutputT:
        _ = (context, run_result)
        return output

    async def run(self, context: ContextT) -> AgentRunResult[OutputT]:
        prompt = self.generate_prompt(context)
        agent = self.build_agent(context=context, prompt=prompt)
        run_result = await agent.run(**self._build_run_call_kwargs(context, prompt))
        run_result.output = self.postprocess_output(
            output=run_result.output,
            context=context,
            run_result=run_result,
        )
        return run_result

    def run_sync(self, context: ContextT) -> AgentRunResult[OutputT]:
        prompt = self.generate_prompt(context)
        agent = self.build_agent(context=context, prompt=prompt)
        run_result = agent.run_sync(**self._build_run_call_kwargs(context, prompt))
        run_result.output = self.postprocess_output(
            output=run_result.output,
            context=context,
            run_result=run_result,
        )
        return run_result

    @staticmethod
    def _build_run_call_kwargs(
        context: ContextT,
        prompt: SituAgentPrompt,
    ) -> dict[str, Any]:
        run_call_kwargs: dict[str, Any] = {"user_prompt": prompt.user_prompt}
        if context.deps is not None:
            run_call_kwargs["deps"] = context.deps
        if context.message_history is not None:
            run_call_kwargs["message_history"] = list(context.message_history)
        if context.usage_limits is not None:
            run_call_kwargs["usage_limits"] = context.usage_limits
        run_call_kwargs.update(context.run_kwargs)
        return run_call_kwargs
