from __future__ import annotations

from evals.worlds.micrograd.models import MicrogradEvalInput


def empty_run_prompt(args: MicrogradEvalInput) -> str:
    return f"""
    Case: {args.case_id}
    Scenario: no baseline evidence has been recorded yet.
    State: {args.state}

    Required behavior:
    - Call run_experiment with components ["baseline"].
    - Call evaluate_evidence for the returned experiment_id.
    - Do not try variants before baseline evidence exists.
    - Final answer must mention baseline.
    """
