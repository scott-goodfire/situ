# Failure Modes

This doc tracks autoresearch failure modes Situ should help expose. Add real
examples from Situ runs when they occur.

## Seed Hacking

Running many seeds and reporting the best result as if it were representative.
Situ should preserve seed and run-count evidence so verifiers can see selection.

## Selection On Noise

Keeping experiments with metric movement inside run-to-run variance while
discarding similar regressions. Situ should make repeated baseline evidence and
variance gaps visible.

## Adaptive Overfitting

Repeatedly querying a held-out set until decisions adapt to its noise. Situ
should surface held-out query count and discourage treating frequently queried
held-out results as independent confirmation.

## Greedy Hill-Climbing

Rejecting intermediate regressions that could combine into a stronger result.
Situ should keep discarded experiments and rationale visible.

## Benchmark Overfitting

Improving the measured score by exploiting the benchmark or evaluation harness
instead of improving the underlying method. Situ should preserve diffs,
artifacts, measurements, and ResearchTaskVerification comments that flag
suspicious wins.

## Evidence-Free Completion

Marking work done with prose but no durable hypothesis, science record,
measurement, artifact, entity link, or task activity. Situ should prefer
durable records and make empty completions easy to spot.

## Tool-Surface Drift

Role prompts, runtime skills, and custom tools disagree about what an agent can
do. Situ should keep role skills, tool schemas, and prompt evals aligned.
