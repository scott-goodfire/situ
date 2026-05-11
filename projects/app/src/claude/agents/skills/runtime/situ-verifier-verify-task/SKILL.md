---
name: situ-verifier-verify-task
description: Use for situ Verifier ResearchTasks with type verify: direct evidence checks, adversarial review, and duplicate/comparability judgments.
---

# situ Verifier Verify Task

Use this skill when the active ResearchTask type is `verify`.

Verify ResearchTasks are Verifier-owned. Treat `workerPrompt` as the
verification assignment and `verificationPrompt` as the acceptance criteria. A
verify ResearchTask may not have a prior Scientist worker result.
Use workerPrompt as the verification assignment.

## Procedure

1. Read the active ResearchTask with `get_research_task`.
2. Inspect related context with `search_research_tasks`, `search_hypotheses`,
   `search_baselines`, `search_experiments`, `search_evaluations`,
   `list_measurements`, `list_artifacts`, and `list_entity_links`.
3. Use `run_readonly_workspace_command` when the verification assignment
   requires direct repository evidence.
4. Check the specific concern named by the prompts: duplicate hypothesis,
   missing primary hypothesis on experiments, missing evidence, eval leakage,
   reward hacking, invalid comparison, weak baseline, suspicious measurement, or
   overclaimed report.
5. Identify the evidence axis the verificationPrompt asked for before judging.
   Common axes are improvement (move a metric), preservation (refactor or
   simplification with metric unchanged within a stated tolerance), behavioral
   (make a previously broken or unreachable path correctly fire), and cleanup
   (shrink surface area while preserving behavior). Apply pass criteria for the
   stated axis, not a default metric-improvement reading. If the
   verificationPrompt did not state an axis, infer the most plausible one from
   the workerPrompt and worker summary and note that gap in your judgment so
   the Manager can write a sharper contract next time.
6. Before judging an experiment, confirm the candidate change actually
   exercised on dev inputs. Read the diff or worker summary and ask: did this
   patch affect any dev outputs? If the patched branch is structurally
   unreachable, fires 0× on dev inputs, or the recorded metric matches baseline
   by trivial vacuous reasoning, the experiment did not test the hypothesis and
   the verdict is `suspicious` regardless of how the metric looks.
7. Use full durable record ids. If a summary abbreviates an id, list or search
   records instead of calling get tools with partial ids.
8. Record exactly one judgment with `record_research_task_verification`. Keep
   it short, human, and evidence-backed.

## Tool Boundaries

Do not create science records, artifacts, measurements, experiments, or
worktrees. Verification writes only a ResearchTaskVerification.
Verifier only has readonly source inspection through
`run_readonly_workspace_command`.

## Choosing a verdict

`passed` means the experiment honestly tested what the prompt asked. The
candidate diff actually exercised on dev inputs and produced trustworthy
signal — positive, null, or negative — that the Manager can act on. Do not
use `passed` for a metric that matches baseline because the patch never fired,
for an unreachable code path, or for a candidate whose evidence reads as
"diff has no effect on dev inputs." Those are `suspicious`, not `passed`.

Judge the metric outcome against the evidence axis stated in the
verificationPrompt. An unchanged or near-baseline metric is `passed` when the
prompt framed the experiment as preservation, cleanup, or a behavioral fix
and the stated quality goal is met. For improvement-axis experiments, be
skeptical of a recorded Δ that maps to only one or two changed dev items out
of N — that is at the noise floor and indistinguishable from random
fluctuation. Such a Δ is `suspicious` unless the verificationPrompt explicitly
accepted sub-quantum improvements with a confirming follow-up experiment in
the lineage.

`failed` means the experiment ran fairly and did not meet the acceptance
criteria stated in `verificationPrompt`. This is an honest negative and
counts as durable anti-evidence the Manager can use to prune a direction.
Do not collapse `suspicious` into `failed`: a hypothesis tested fairly and
refuted is not the same as an experiment that never actually tested it.

`suspicious` means the experiment is not a valid test. Use for: structurally
dead patches; patches that fire 0× on dev inputs; reward hacks; eval leakage;
comparability breaks (prepare.py / scoring / data-gen changes); invented
metrics; overclaim against weak or wrong baselines.

`needs_more_evidence` reopens the task as planned work. Use when the design
is sound but the data is missing or incomplete and a re-run with the same
patch would resolve it.

## Held-out cross-check

Some projects emit metrics from more than one evaluation split — typically a
`dev` split that drives the keep/discard decision and a `holdout` (or `final`,
`test`) split that exists as a trust check, not an optimization target. When
the measurement payload nests metrics under split names (`metrics.dev.*` and
`metrics.holdout.*`, or the names this project established in its baseline),
do a side-by-side cross-check before recording the verdict.

The cross-check does **not** change the verdict. Pass/fail is decided on the
dev-side evidence axis stated in the verificationPrompt, exactly as before.
The held-out reading is a signal layered on top — its job is to flag a
discard that may be premature, not to flip a fail into a pass or vice versa.

When you have both splits for the candidate and a comparable baseline:

1. Compute the dev delta and the held-out delta against the same baseline
   surface. Write them out in your reasoning — do not try to compare in your
   head.
2. If the splits move in the same direction, no signal is needed.
3. If they disagree in direction and the held-out movement looks meaningful
   given what you have seen of this metric's noise in prior measurements,
   pass `signals: { suspicious_holdout_divergence: true, devDelta: <number>,
holdoutDelta: <number>, rationale: "<short citation of the prior-noise
reference point you used>" }` to `record_research_task_verification`, and
   name the divergence and the deltas in your judgment so the Manager sees
   the same evidence. Use judgment on "meaningful" — a held-out wiggle
   inside the project's normal noise floor is not worth flagging.
4. If only one split is present, do not flag. If neither split convention is
   used in the payload, do not flag.

The Manager reads this signal to decide whether to redesign the candidate
rather than abandon the hypothesis. The signal is advisory; the verdict
stands on its own.
