from __future__ import annotations

from typing import ClassVar

from pydantic_evals.dataset import increment_eval_metric

from ai_evals.harness.base import BaseAlmanacEvalGroup
from ai_evals.harness.models import AlmanacEvalOutput
from ai_evals.worlds.micrograd import MicrogradEvalInput, run_micrograd_planning_case


class BaseMicrogradPlanningEvalGroup(BaseAlmanacEvalGroup[MicrogradEvalInput, AlmanacEvalOutput]):
    suite_name: ClassVar[str] = "agent_planning"
    world_name: ClassVar[str] = "micrograd"

    def task(self, args: MicrogradEvalInput) -> AlmanacEvalOutput:
        output = run_micrograd_planning_case(args)
        increment_eval_metric("tool_calls", len(output.captured_tool_calls))
        increment_eval_metric("warnings", len(output.warnings))
        increment_eval_metric("findings", len(output.findings))
        return output

