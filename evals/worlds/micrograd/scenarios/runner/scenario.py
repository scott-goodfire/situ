from __future__ import annotations

from evals.worlds.micrograd.models import MicrogradEvalInput
from evals.worlds.micrograd.scenarios.after_baseline import after_baseline_prompt
from evals.worlds.micrograd.scenarios.after_simple_variants import after_simple_variants_prompt
from evals.worlds.micrograd.scenarios.empty_run import empty_run_prompt
from evals.worlds.micrograd.scenarios.suspicious_win import suspicious_win_prompt
from evals.worlds.micrograd.scenarios.synthesize_findings import synthesize_findings_prompt


def micrograd_scenario_prompt(args: MicrogradEvalInput) -> str:
    if args.scenario == "empty_run":
        return empty_run_prompt(args)
    if args.scenario == "after_baseline":
        return after_baseline_prompt(args)
    if args.scenario == "after_simple_variants":
        return after_simple_variants_prompt(args)
    if args.scenario == "suspicious_win":
        return suspicious_win_prompt(args)
    if args.scenario == "synthesize_findings":
        return synthesize_findings_prompt(args)

    raise ValueError(f"Unhandled scenario: {args.scenario}")
