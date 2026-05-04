from __future__ import annotations

from evals.harness.models import AlmanacEvalOutput
from evals.worlds.micrograd.world import MicrogradWorld


def run_synthesize_findings_scenario(world: MicrogradWorld) -> AlmanacEvalOutput:
    content = "Synthesize findings from baseline, A, B, C, and A+C evidence."
    for components in [["baseline"], ["A"], ["B"], ["C"], ["A", "C"]]:
        evidence = world.run_experiment(content=f"Review evidence for {components}.", components=components)
        world.evaluate_evidence(evidence)
    world.record_finding(
        content=(
            "C improves the most among single variants, A+C is strongest overall, "
            "and B is less attractive due to runtime."
        ),
        evidence_ids=["exp_baseline", "exp_a", "exp_b", "exp_c", "exp_a_c"],
    )
    return world.output(content)
