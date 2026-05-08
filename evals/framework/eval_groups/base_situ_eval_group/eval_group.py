from __future__ import annotations

from abc import abstractmethod
from pathlib import Path
import re
from typing import Any, ClassVar, Generic, Sequence, TypeVar

from pydantic import BaseModel, ConfigDict
from pydantic_evals import Case, Dataset
from pydantic_evals.evaluators import Evaluator

T_Input = TypeVar("T_Input", bound=BaseModel)
T_Output = TypeVar("T_Output", bound=BaseModel)


class BaseSituEvalGroup(BaseModel, Generic[T_Input, T_Output]):
    """Base class for Situ eval groups."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    suite_name: ClassVar[str]
    world_name: ClassVar[str]
    cases_path: ClassVar[Path | None] = None
    custom_evaluator_types: ClassVar[Sequence[type[Evaluator[Any, Any, Any]]]] = ()

    def __init__(self, **data: Any) -> None:
        super().__init__(**data)
        if not getattr(self, "suite_name", None):
            raise NotImplementedError("Eval groups must define suite_name")
        if not getattr(self, "world_name", None):
            raise NotImplementedError("Eval groups must define world_name")

    @abstractmethod
    def task(self, args: T_Input) -> T_Output:
        raise NotImplementedError

    def eval_cases(self) -> list[Case[T_Input, T_Output]]:
        # Default for YAML-backed suites. Suites that keep cases in Python override this.
        return []

    def dataset(self) -> Dataset[T_Input, T_Output, Any]:
        if self.cases_path is not None:
            return self._load_yaml_dataset()
        cases = _filter_skipped(self.eval_cases())
        return Dataset(
            name=self._dataset_name(),
            cases=cases,
            evaluators=list(self.dataset_evaluators()),
        )

    def dataset_evaluators(self) -> Sequence[Evaluator[Any, Any, Any]]:
        return []

    def teardown(self) -> None:
        return None

    def _load_yaml_dataset(self) -> Dataset[T_Input, T_Output, Any]:
        assert self.cases_path is not None
        input_type, output_type = self._concrete_io_types()
        dataset_cls = Dataset[input_type, output_type, Any]  # type: ignore[valid-type]
        dataset = dataset_cls.from_file(
            self.cases_path,
            custom_evaluator_types=list(self.custom_evaluator_types),
        )
        dataset.name = self._dataset_name()
        dataset.cases = _filter_skipped(dataset.cases)
        for case in dataset.cases:
            _autofill_case_id(case)
        return dataset

    def _dataset_name(self) -> str:
        return f"{_eval_name_segment(self.suite_name)}.{_eval_name_segment(self.world_name)}"

    @classmethod
    def _concrete_io_types(cls) -> tuple[type, type]:
        for ancestor in cls.__mro__:
            meta = getattr(ancestor, "__pydantic_generic_metadata__", None)
            if not meta:
                continue
            args = meta.get("args") or ()
            if len(args) >= 2 and not _is_typevar(args[0]) and not _is_typevar(args[1]):
                return args[0], args[1]
        raise RuntimeError(
            f"Cannot resolve T_Input/T_Output for {cls.__name__}; "
            "set the generic parameters on the class declaration."
        )


def _filter_skipped(cases: list[Case[Any, Any]]) -> list[Case[Any, Any]]:
    return [
        case
        for case in cases
        if not (case.metadata and isinstance(case.metadata, dict) and case.metadata.get("@skip"))
    ]


def _autofill_case_id(case: Case[Any, Any]) -> None:
    inputs = case.inputs
    if not hasattr(inputs, "case_id"):
        return
    if getattr(inputs, "case_id", None):
        return
    try:
        setattr(inputs, "case_id", case.name)
    except Exception:
        pass


def _eval_name_segment(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _is_typevar(value: Any) -> bool:
    return isinstance(value, TypeVar)
