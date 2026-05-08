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
review plus obvious process checks to decide whether a concern comment is
warranted.

## Suspicious Results

A suspicious result is measurement evidence, or interpretation of that
evidence, that should not be treated as trustworthy support without review or
corroboration.

When this happens:

- Keep the measurement or result record.
- Record a concern on the relevant measurement, evaluation, or experiment.
- Preserve artifact references.
- Explain the reason in plain language.
- Show the concern in the TUI.

## Critic Review

The Critic is the LLM reviewer for proposed experiment changes. It
does not replace deterministic trust checks, and it should not mutate candidate
code. It reviews an experiment after the Scientist has recorded candidate
workspace state and evaluation evidence, then records an experiment activity
that explains whether the evidence is usable, suspicious, invalid, or needs
reproduction.

The review should explicitly look for common autoresearch failure modes:

- Seed hacking or cherry-picked random seeds.
- Selection on noisy repeated measurements.
- Adaptive overfitting to the same evaluation surface.
- Greedy hill-climbing that discards a useful partial result too early.
- Comparability breaks such as eval/test/dependency/toolchain changes.

The Critic may flag concerns with payload metadata, but the body must stay
human-readable. A Critic concern is evidence for the Manager and human, not a
hardcoded policy engine by itself.

## Product Rule

Metric movement is not enough. The dashboard must distinguish observed results
from trustworthy interpretation.

Likewise, a passing test command is not enough. Situ should preserve enough
workspace-state context to show whether the passing result is comparable to the
baseline. See
[0012-experiment-workspace-state/SPEC.md](../0012-experiment-workspace-state/SPEC.md).
