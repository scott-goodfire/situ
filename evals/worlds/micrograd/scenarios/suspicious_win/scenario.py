from __future__ import annotations

from evals.worlds.micrograd.models import MicrogradEvalInput


def suspicious_win_prompt(args: MicrogradEvalInput) -> str:
    return f"""
    Case: {args.case_id}
    Scenario: a bad variant reports a huge score jump but changes evidence shape.
    State: {args.state}

    Required behavior:
    - Call run_experiment with components ["bad"].
    - Call evaluate_evidence for the returned experiment_id.
    - Treat evidence_shape_changed and missing_signal warnings as suspicious.
    - Call record_finding with content that includes "suspicious".
    - Final answer must begin with or include the exact phrase "Do not trust".
    """
