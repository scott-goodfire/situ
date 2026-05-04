from __future__ import annotations

from evals.harness.models import AlmanacEvalOutput
from evals.worlds.micrograd.world import MicrogradWorld


def run_after_simple_variants_scenario(world: MicrogradWorld) -> AlmanacEvalOutput:
    content = "A and C are the promising components, so try A+C as a combination."
    evidence = world.run_experiment(content=content, components=["A", "C"])
    world.evaluate_evidence(evidence)
    world.record_finding(
        content="A+C is the best valid combination in this fixture world.",
        evidence_ids=[evidence.experiment_id],
    )
    return world.output(content)
