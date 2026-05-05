# Guardrails

In the first slice, "guardrails" means automated trust checks.

They protect interpretation activities from obvious invalidity. The user should
not have to manually enumerate every forbidden behavior before Almanac can
notice suspicious results.

## Current Trust Checks

The current slice should catch obvious issues without requiring the user to
enumerate everything up front:

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

The first slice should not deterministically parse arbitrary command output
into signals. When a project prints plaintext, agents should preserve the
output and use LLM review plus obvious process checks to decide whether a
concern comment is warranted.

## Suspicious Results

A suspicious result is experiment activity that should not be treated as
trustworthy support without review or corroboration.

When this happens:

- Keep the result activity.
- Record a concern activity on the experiment.
- Preserve artifact references.
- Explain the reason in plain language.
- Show the concern in the TUI.

## Product Rule

Metric movement is not enough. The dashboard must distinguish observed results
from trustworthy interpretation.

Likewise, a passing test command is not enough. Almanac should preserve enough
workspace-state context to show whether the passing result is comparable to the
baseline. See
[0012-experiment-workspace-state/SPEC.md](../0012-experiment-workspace-state/SPEC.md).
