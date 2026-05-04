from __future__ import annotations

from evals.harness.models import AlmanacEvalOutput
from evals.worlds.micrograd.models import MicrogradEvalInput
from evals.worlds.micrograd.scenarios.after_baseline import run_after_baseline_scenario
from evals.worlds.micrograd.scenarios.after_simple_variants import run_after_simple_variants_scenario
from evals.worlds.micrograd.scenarios.empty_run import run_empty_run_scenario
from evals.worlds.micrograd.scenarios.suspicious_win import run_suspicious_win_scenario
from evals.worlds.micrograd.scenarios.synthesize_findings import run_synthesize_findings_scenario
from evals.worlds.micrograd.world import MicrogradWorld


def run_micrograd_planning_case(args: MicrogradEvalInput) -> AlmanacEvalOutput:
    world = MicrogradWorld(expected_signals=args.expected_signals)

    if args.scenario == "empty_run":
        return run_empty_run_scenario(world)
    if args.scenario == "after_baseline":
        return run_after_baseline_scenario(world)
    if args.scenario == "after_simple_variants":
        return run_after_simple_variants_scenario(world)
    if args.scenario == "suspicious_win":
        return run_suspicious_win_scenario(world)
    if args.scenario == "synthesize_findings":
        return run_synthesize_findings_scenario(world)

    raise ValueError(f"Unhandled scenario: {args.scenario}")
