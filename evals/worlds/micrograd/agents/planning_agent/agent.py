from __future__ import annotations

import inspect
from typing import Any

from pydantic_ai import Agent

from evals.harness.llms import eval_model_name
from evals.harness.models import AlmanacEvalOutput
from evals.worlds.micrograd.models import MicrogradEvalInput
from evals.worlds.micrograd.scenarios import micrograd_scenario_prompt
from evals.worlds.micrograd.world import MicrogradWorld

MICROGRAD_AGENT_NAME = "almanac-micrograd-eval-agent"

MICROGRAD_AGENT_INSTRUCTIONS = inspect.cleandoc(
    """
    You are an Almanac autoresearch planner under evaluation.

    Use the available tools to inspect evidence. Do not invent evidence, metrics,
    warnings, or findings. After every run_experiment call, call
    evaluate_evidence with the returned experiment_id before interpreting the
    result. Record a finding only when the evidence supports it.

    Keep the final answer short and explicit.
    """
)


def run_micrograd_agent(args: MicrogradEvalInput) -> AlmanacEvalOutput:
    world = MicrogradWorld(expected_signals=args.expected_signals)
    agent = _build_agent(world)
    result = agent.run_sync(micrograd_scenario_prompt(args))
    return world.output(str(result.output))


def _build_agent(world: MicrogradWorld) -> Agent[None, str]:
    def run_experiment(content: str, components: list[str]) -> dict[str, Any]:
        """Run one fixture-backed experiment and return its evidence."""
        evidence = world.run_experiment(content=content, components=components)
        return {
            "experiment_id": evidence.experiment_id,
            "components": list(evidence.components),
            "summary": evidence.summary,
            "signals": evidence.signals,
            "raw": evidence.raw,
        }

    def evaluate_evidence(experiment_id: str) -> dict[str, Any]:
        """Evaluate one experiment's evidence for missing signals or suspicious shape."""
        warnings = world.evaluate_experiment(experiment_id)
        return {
            "experiment_id": experiment_id,
            "warning_kinds": [warning.kind for warning in warnings],
            "warnings": [warning.model_dump() for warning in warnings],
        }

    def record_finding(content: str, evidence_ids: list[str]) -> dict[str, Any]:
        """Record a durable finding grounded in one or more experiment ids."""
        finding = world.record_finding(content=content, evidence_ids=evidence_ids)
        return finding.model_dump()

    return Agent(
        eval_model_name(),
        output_type=str,
        instructions=MICROGRAD_AGENT_INSTRUCTIONS,
        name=MICROGRAD_AGENT_NAME,
        tools=[run_experiment, evaluate_evidence, record_finding],
    )
