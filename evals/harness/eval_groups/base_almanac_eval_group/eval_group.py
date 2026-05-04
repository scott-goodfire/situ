from __future__ import annotations

from abc import abstractmethod
from typing import Any, ClassVar, Generic, Sequence, TypeVar

from pydantic import BaseModel, ConfigDict
from pydantic_evals import Case, Dataset
from pydantic_evals.evaluators import Evaluator

T_Input = TypeVar("T_Input", bound=BaseModel)
T_Output = TypeVar("T_Output", bound=BaseModel)


class BaseAlmanacEvalGroup(BaseModel, Generic[T_Input, T_Output]):
    """Base class for Almanac AI eval groups."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    suite_name: ClassVar[str]
    world_name: ClassVar[str]

    def __init__(self, **data: Any) -> None:
        super().__init__(**data)
        if not getattr(self, "suite_name", None):
            raise NotImplementedError("Eval groups must define suite_name")
        if not getattr(self, "world_name", None):
            raise NotImplementedError("Eval groups must define world_name")

    @abstractmethod
    def task(self, args: T_Input) -> T_Output:
        raise NotImplementedError

    @abstractmethod
    def eval_cases(self) -> list[Case[T_Input, T_Output]]:
        raise NotImplementedError

    def dataset(self) -> Dataset[T_Input, T_Output, Any]:
        cases = [
            case
            for case in self.eval_cases()
            if not (case.metadata and isinstance(case.metadata, dict) and case.metadata.get("@skip"))
        ]
        return Dataset(
            name=f"{self.suite_name}.{self.world_name}",
            cases=cases,
            evaluators=list(self.dataset_evaluators()),
        )

    def dataset_evaluators(self) -> Sequence[Evaluator[Any, Any, Any]]:
        return []

    def teardown(self) -> None:
        return None
