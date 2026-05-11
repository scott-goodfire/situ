---
name: situ-context-meta
description: Use when learning or maintaining Situ's .agents layer, including docs, policies, workflow skills, context skills, and meta checks.
---

# Situ Context Meta

## Goal

Learn how the `.agents` layer maintains the repo. Keep this exploratory:
locate the docs, policies, workflows, checks, and examples that govern
the artifact you are changing.

## What To Look For

Locate the meta-layer inventory:

- docs
- policy skills
- workflow skills
- context skills
- specs, if present
- lint/check scripts
- meta maintenance workflows

Locate the governing rule for the artifact type:

- policy skill shape
- workflow skill shape
- context skill shape
- docs shape
- spec shape
- prose quality
- policy linting

Locate nearby examples:

- similar policy skills
- similar workflow skills
- similar context skills
- related docs
- recent changes in the same layer

Locate validation paths:

- structural policy lint
- markdown lint
- typos/prose checks
- full repo check
- fresh-agent context validation
- policy audit or policy-run workflow when the change affects a rule

## What To Learn

Build a file-backed answer to:

- Is this a policy, workflow, context skill, doc, spec, or tool config?
- Which existing rule governs its shape?
- Which nearby examples are closest?
- Is the artifact procedural, policy-like, or explanatory prose?
- What checks prove the meta-layer still resolves and lints?
- Should a fresh-agent validation run be used?

## Investigation Pattern

For a meta-layer change:

1. Classify the artifact type.
2. Locate the governing policy.
3. Inspect similar artifacts.
4. Keep architecture content in source or docs; keep skills procedural.
5. For context skills, prefer concepts and "what to learn" over fixed
   filenames, commands, or line windows.
6. Run structural and prose checks before reporting.

## Fresh-Agent Validation

To validate a context skill, use a fresh agent so cached knowledge does
not mask gaps. Ask it to:

- read and follow the context skill
- answer broad feature questions with file references
- state what it inspected
- critique whether the context skill helped it find current source
- identify brittle or stale instructions

If subagents are unavailable, use another fresh agent or a new session.

## Reporting

Report artifact type, governing policy, examples inspected, checks run,
fresh-agent validation outcome if used, and remaining uncertainty.
