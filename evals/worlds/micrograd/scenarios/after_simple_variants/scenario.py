from __future__ import annotations

from evals.worlds.micrograd.models import MicrogradEvalInput


def after_simple_variants_prompt(args: MicrogradEvalInput) -> str:
    return f"""
    Case: {args.case_id}
    Scenario: A and C improved over baseline; B was weaker and slower.
    State: {args.state}

    Required behavior:
    - Try the combination A+C by calling run_experiment with components ["A", "C"].
    - Call evaluate_evidence for the returned experiment_id.
    - Call record_finding with content that includes "best valid combination".
    - Final answer must include "A+C".
    """
