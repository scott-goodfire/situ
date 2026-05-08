# Guardrails

"Guardrails" means automated trust checks.

They protect interpretation activities from obvious invalidity. The user should
not have to manually enumerate every forbidden behavior before Situ can
notice suspicious results.

The failure modes these checks protect against are catalogued in
[../../docs/failure-modes/DOC.md](../../docs/failure-modes/DOC.md).

## Trust Checks

Trust checks catch obvious issues without requiring the user to enumerate
everything up front:

- Evaluation failed.
- Command failed or timed out.
- Command output is missing, malformed for the stated context, or too
  ambiguous to support a conclusion.
- Evaluation or measurement artifacts changed unexpectedly.
- Sample count or eval scope changed unexpectedly when detectable.
- Workspace starts dirty without an explicit baseline decision.
- Candidate changes tests, evals, benchmarks, fixtures, dependency files,
  toolchain config, or generated/cache files unexpectedly.
- Candidate uses a different eval command, interpreter, or toolchain than the
  baseline when detectable.
- Test count or result shape changes compared with baseline.
- Result improved suspiciously much without corroborating context.

Situ does not deterministically parse arbitrary command output into signals.
When a project prints plaintext, agents preserve the output and use LLM
review plus obvious process checks to decide whether to flag the result.

## Suspicious Results

A suspicious result is measurement evidence, or interpretation of that
evidence, that should not be treated as trustworthy support without review or
corroboration.

When this happens:

- Keep the measurement or result record.
- Cancel the affected record (or its parent) with a comment that explains the
  problem. The cancellation comment serves as the visible flag.
- Preserve artifact references.
- Explain the reason in plain language in the cancellation comment.

## Critic Review

The Critic is the LLM reviewer for research records (analyses, hypotheses,
baselines, experiments, evaluations). It does not replace deterministic trust
checks, and it should not mutate candidate code. It scans the project for
records in `triage` or `in_review`, reads the relevant evidence, and acts
directly via transition tools.

When the Critic finds a problem, it calls `cancel_<record>` with a comment
that explains. When the Critic finds the record acceptable, it calls
`accept_<record>` or `complete_<record>` with a comment. The cancellation IS
the verdict; the comment IS the reason. The status transition plus its comment
carry the judgment.

The review should explicitly look for common autoresearch failure modes:

- Seed hacking or cherry-picked random seeds.
- Selection on noisy repeated measurements.
- Adaptive overfitting to the same evaluation surface.
- Greedy hill-climbing that discards a useful partial result too early.
- Comparability breaks such as eval/test/dependency/toolchain changes.

The Critic's per-record-kind methodology lives in
`agent_skills/critic/`. Cancellation comments are evidence for the Manager and
human, not a hardcoded policy engine.

## Product Rule

Metric movement is not enough. The dashboard must distinguish observed results
from trustworthy interpretation.

Likewise, a passing test command is not enough. Situ should preserve enough
workspace-state context to show whether the passing result is comparable to the
baseline. See
[0012-experiment-workspace-state/SPEC.md](../0012-experiment-workspace-state/SPEC.md).
