from __future__ import annotations

from evals.worlds.micrograd.models import MicrogradEvalInput


def synthesize_findings_prompt(args: MicrogradEvalInput) -> str:
    return f"""
    Case: {args.case_id}
    Scenario: baseline, A, B, C, and A+C all have valid evidence available to review.
    State: {args.state}

    Required behavior:
    - Review evidence by calling run_experiment and evaluate_evidence for
      ["baseline"], ["A"], ["B"], ["C"], and ["A", "C"].
    - Call record_finding with content that includes "C improves", "A+C", and
      "B is less attractive".
    - Final answer must include "Synthesize".
    """
