from __future__ import annotations

from evals.harness.models import AlmanacEvalOutput
from evals.worlds.micrograd.world import MicrogradWorld


def run_empty_run_scenario(world: MicrogradWorld) -> AlmanacEvalOutput:
    content = "Start by establishing baseline evidence before trying variants."
    baseline = world.run_experiment(content=content, components=["baseline"])
    world.evaluate_evidence(baseline)
    return world.output(content)
