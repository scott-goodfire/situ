from __future__ import annotations

from evals.harness.models import AlmanacEvalOutput
from evals.worlds.micrograd.world import MicrogradWorld


def run_suspicious_win_scenario(world: MicrogradWorld) -> AlmanacEvalOutput:
    content = "Do not trust the huge bad result until evidence shape and missing signals are resolved."
    evidence = world.run_experiment(content="Probe suspicious bad variant.", components=["bad"])
    world.evaluate_evidence(evidence)
    world.record_finding(
        content="The bad variant is suspicious, not an accepted improvement.",
        evidence_ids=[evidence.experiment_id],
    )
    return world.output(content)
