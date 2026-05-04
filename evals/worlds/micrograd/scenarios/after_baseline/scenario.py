from __future__ import annotations

from evals.harness.models import AlmanacEvalOutput
from evals.worlds.micrograd.world import MicrogradWorld


def run_after_baseline_scenario(world: MicrogradWorld) -> AlmanacEvalOutput:
    content = "Explore simple variants A, B, and C before combining directions."
    for component in ["A", "B", "C"]:
        evidence = world.run_experiment(content=f"Try simple variant {component}.", components=[component])
        world.evaluate_evidence(evidence)
    world.record_finding(
        content="A and C look more promising than B; keep breadth before committing.",
        evidence_ids=["exp_a", "exp_b", "exp_c"],
    )
    return world.output(content)
