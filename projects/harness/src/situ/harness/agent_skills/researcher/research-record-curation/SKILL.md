---
name: research-record-curation
description: Use when the Researcher needs to reduce entropy among analyses and hypotheses by consolidating duplicates, superseding stale understanding, sharpening claims, or resolving obsolete hypotheses.
---

# Research Record Curation

## Scope

Curate analyses and hypotheses. Evidence-producing records such as baselines,
experiments, evaluations, and measurements remain durable evidence; do not
merge or delete them from this skill.

## Method

1. Read `get_project_overview`.
2. Search prior work with `search_everything`, then narrow with
   `search_analyses`, `search_hypotheses`, `list_analysis_activities`, and
   `list_hypothesis_activities`.
3. Group analyses and hypotheses by claim, evidence base, measurement target,
   and next experiment they imply.
4. For analyses:
   - Use `update_analysis` when a small correction is enough.
   - Use `create_analysis` for a synthesis analysis when several notes should
     become one clearer project understanding.
   - Set `supersedes_analysis_id` when the created or updated analysis replaces
     a specific older analysis.
   - Use `add_analysis_comment` to explain what was superseded, narrowed, or
     kept.
   - Use `cancel_analysis` for duplicate or unusable analyses; do not delete
     them.
5. For hypotheses:
   - Use `update_hypothesis` to sharpen vague hypotheses into testable claims.
   - Use `resolve_hypothesis` with `supported`, `rejected`, `superseded`, or
     `inconclusive` when evidence is sufficient.
   - Set `superseded_by_hypothesis_id` when one hypothesis replaces another.
   - Use `add_hypothesis_comment` to preserve curation rationale.
   - Use `cancel_hypothesis` for duplicate, untestable, or irrelevant
     hypotheses.
6. Link the assigned task to the analyses and hypotheses touched.
7. Call `complete_task` with a short summary of what was consolidated and which
   records are now canonical.

## Curation Rules

- Do not delete research records.
- Do not hide contradictory evidence; preserve it and explain how the current
  synthesis interprets it.
- Do not create a synthesis analysis unless it materially reduces duplicate or
  stale context.
- Do not resolve a hypothesis without recorded evidence or a clear reason it is
  superseded or inconclusive.
- Leave baselines, experiments, evaluations, and measurements intact; use them
  as evidence cited by the curated analyses or hypotheses.
