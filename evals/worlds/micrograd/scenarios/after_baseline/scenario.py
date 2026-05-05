from __future__ import annotations

from evals.worlds.micrograd.models import MicrogradEvalInput


def after_baseline_prompt(args: MicrogradEvalInput) -> str:
    return f"""
    Case: {args.case_id}
    Scenario: baseline exists, but no simple variants have been tried.
    State: {args.state}

    Required behavior:
    - Explore simple variants A, B, and C before combining directions.
    - Call run_experiment once for ["A"], once for ["B"], and once for ["C"].
    - Call evaluate_evidence for each returned experiment_id.
    - Call record_finding with content that includes "A and C".
    - Final answer must include the exact phrase "A, B, and C".
    """
