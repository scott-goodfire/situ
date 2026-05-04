from __future__ import annotations

from typing import ClassVar

from pydantic_evals import Case
from pydantic_evals.dataset import increment_eval_metric

from evals.harness import BaseAlmanacEvalGroup
from evals.harness.models import AlmanacEvalOutput
from evals.suites.agent_planning.micrograd.cases import micrograd_planning_cases
from evals.worlds.micrograd import MicrogradEvalInput, run_micrograd_planning_case


class MicrogradPlanningEvalGroup(BaseAlmanacEvalGroup[MicrogradEvalInput, AlmanacEvalOutput]):
    suite_name: ClassVar[str] = "agent_planning"
    world_name: ClassVar[str] = "micrograd"

    def task(self, args: MicrogradEvalInput) -> AlmanacEvalOutput:
        output = run_micrograd_planning_case(args)
        increment_eval_metric("tool_calls", len(output.captured_tool_calls))
        increment_eval_metric("warnings", len(output.warnings))
        increment_eval_metric("findings", len(output.findings))
        return output

    def eval_cases(self) -> list[Case[MicrogradEvalInput, AlmanacEvalOutput]]:
        return micrograd_planning_cases()
