from __future__ import annotations

from typing import Any, ClassVar, Sequence

from pydantic_evals import Case, set_eval_attribute
from pydantic_evals.dataset import increment_eval_metric
from pydantic_evals.evaluators import Evaluator, HasMatchingSpan

from evals.harness import BaseAlmanacEvalGroup
from evals.harness.models import AlmanacEvalOutput
from evals.suites.agent_planning.micrograd.cases import micrograd_planning_cases
from evals.worlds.micrograd import MicrogradEvalInput, run_micrograd_planning_case


class MicrogradPlanningEvalGroup(BaseAlmanacEvalGroup[MicrogradEvalInput, AlmanacEvalOutput]):
    suite_name: ClassVar[str] = "agent_planning"
    world_name: ClassVar[str] = "micrograd"

    def task(self, args: MicrogradEvalInput) -> AlmanacEvalOutput:
        set_eval_attribute("suite", self.suite_name)
        set_eval_attribute("world", self.world_name)
        set_eval_attribute("case_id", args.case_id)
        set_eval_attribute("scenario", args.scenario)
        set_eval_attribute("expected_signals", args.expected_signals)
        set_eval_attribute("expected_signal_count", len(args.expected_signals))
        output = run_micrograd_planning_case(args)
        increment_eval_metric("tool_calls", len(output.captured_tool_calls))
        increment_eval_metric("warnings", len(output.warnings))
        increment_eval_metric("findings", len(output.findings))
        return output

    def eval_cases(self) -> list[Case[MicrogradEvalInput, AlmanacEvalOutput]]:
        return micrograd_planning_cases()

    def dataset_evaluators(self) -> Sequence[Evaluator[Any, Any, Any]]:
        return [
            HasMatchingSpan(
                query={"name_contains": "almanac.eval.tool_call.run_experiment"},
                evaluation_name="run_experiment_span_recorded",
            )
        ]
