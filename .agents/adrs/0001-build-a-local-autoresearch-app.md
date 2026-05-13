---
status: accepted
implementation_status: not_applicable
created: 2026-05-12
---

# 0001. Build A Local Autoresearch App

## Context

Situ is exploring whether coding agents can help search a repository for better
solutions, verify evidence, and summarize what happened. The goal is not to
build a generic workflow product or a remote SaaS coordination tool. The app is
for local, repo-centered experimentation.

Related work such as Sakana's AI Scientist points toward autonomous research
loops, but Situ's first target is software repositories: inspect code, propose
changes, run experiments, record evidence, verify claims, and report results.

## Decision

Situ will be a local autoresearch app for a repository.

The backend will preserve durable product records for goals, tasks,
experiments, measurements, reviews, comments, artifacts, agents, agent sessions,
notifications, and events. Final answers must be reconstructable from those
records, not from model memory alone.

## Consequences

The app can depend on local repository paths, local SQLite state, local
worktrees, and local command execution.

The system should prioritize evidence and repeatability over polished
workflow automation. If an agent produces a conclusion, the underlying records
should show how it got there.

Situ should not introduce remote multi-tenant concepts until the local product
model has proven it needs them.

## Related

- Architecture: `.agents/docs/architecture/DOC.md`
- Reading: [AI-Scientist-v2](https://github.com/SakanaAI/AI-Scientist-v2)
