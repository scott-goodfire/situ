from __future__ import annotations

from typing import Any, ClassVar

from pydantic import BaseModel
from pydantic_evals import Case

from evals.harness.eval_groups.base_almanac_eval_group import BaseAlmanacEvalGroup


class _Input(BaseModel):
    value: str


class _Output(BaseModel):
    value: str


class _KebabNameEvalGroup(BaseAlmanacEvalGroup[_Input, _Output]):
    suite_name: ClassVar[str] = "tools"
    world_name: ClassVar[str] = "research_tools"

    def task(self, args: _Input) -> _Output:
        return _Output(value=args.value)

    def eval_cases(self) -> list[Case[_Input, _Output]]:
        return [Case(name="case", inputs=_Input(value="ok"))]


def test_dataset_name_uses_kebab_segments_with_dot_separator() -> None:
    dataset = _KebabNameEvalGroup().dataset()

    assert dataset.name == "tools.research-tools"
