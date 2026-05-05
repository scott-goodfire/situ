---
title: Evidence Backed Findings
status: active
---

# Policy: Evidence Backed Findings

## Applies To

Findings, experiment summaries, TUI finding panels, agent-readable run context,
and any future finding extraction logic.

## Rule

Findings must be grounded in experiment evidence. They should summarize what the
run appears to have learned, not just restate a metric or invent a conclusion.

## Required Checks

- Every finding links to one or more experiment IDs.
- Findings distinguish supported, open, and contradicted claims.
- Findings can cite suspicious evidence, but suspicious evidence should not
  support a claim unless it is resolved or clearly caveated.
- Findings are concise enough to scan in the TUI.
- A finding can describe combinations and interactions without requiring a
  first-class Variant model.

## Red Flags

- A finding with no evidence link.
- A finding that treats one noisy metric movement as a durable conclusion.
- A finding that hides suspicious evidence.
- A finding system that becomes a complex knowledge graph before the MVP loop is
  useful.
