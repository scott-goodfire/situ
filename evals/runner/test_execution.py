from __future__ import annotations

from typing import Any, ClassVar

from pydantic import BaseModel
from pydantic_evals import Case

from evals.harness import BaseSituEvalGroup
from evals.runner.execution import run_evals


class _Input(BaseModel):
    value: str


class _Output(BaseModel):
    value: str


class _DummyEvalGroup(BaseSituEvalGroup[_Input, _Output]):
    suite_name: ClassVar[str] = "tools"
    world_name: ClassVar[str] = "dummy"

    def task(self, args: _Input) -> _Output:
        return _Output(value=args.value)

    def eval_cases(self) -> list[Case[_Input, _Output]]:
        return [Case(name="known_case", inputs=_Input(value="ok"))]


def test_case_filter_with_no_matches_fails_without_running_cases() -> None:
    results, failures = run_evals(
        [("DummyEvalGroup", _DummyEvalGroup)],
        case_filter="definitely_no_match",
        max_concurrency=1,
        task_retries=0,
        evaluator_retries=0,
    )

    assert results == []
    assert failures == ["No eval cases matched --case 'definitely_no_match'"]
