---
name: situ-verifier-verify-task
description: Use for Situ Verifier ResearchTasks with type verify: direct evidence checks, adversarial review, and duplicate/comparability judgments.
---

# Situ Verifier Verify Task

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
5. Use full durable record ids. If a summary abbreviates an id, list or search
   records instead of calling get tools with partial ids.
6. Record exactly one judgment with `record_research_task_verification`. Keep
   it short, human, and evidence-backed.

## Tool Boundaries

Do not create science records, artifacts, measurements, experiments, or
worktrees. Verification writes only a ResearchTaskVerification.
Verifier only has readonly source inspection through
`run_readonly_workspace_command`.

Use status `passed` only when durable evidence supports the claim. Use
`failed`, `suspicious`, or `needs_more_evidence` when the evidence is missing,
invalid, or untrustworthy. `needs_more_evidence` reopens the task as planned
work.
