# Verified Search Flow

This document describes the intended end-state flow for Situ as a verified
research-task system. It focuses on the product and agent behavior we want, not
the migration path or exact database schema.

## Core idea

Situ should optimize for the best reachable research outcome, not just complete
a flat queue of work. The main loop is a search over possible research tasks,
where each meaningful task has a worker prompt and verification prompt before it
changes the system's belief about what is promising.

```text
Research Project
  -> project baseline
  -> baseline confirmation
  -> search phase
  -> verified research task tree
  -> evidence-backed report
```

The system should preserve the useful team shape:

```text
Manager = search policy, planner, and budget owner
Scientist = worker that executes concrete research tasks
Verifier = checker that validates the task output and its evidence
User = goal setter, baseline approver, and escalation point
```

The important change in the end state is that the unit of progress is not "a
generic task was completed." The unit of progress is "a research task was
planned, executed, verified, and incorporated into the search state."

## Product phases

### 1. Setup

The app starts behind a settings gate when local secrets are missing. The user
cannot start autonomous research until required local configuration is present.

```text
[Open App]
    |
    v
[Settings Ready?] -- no --> [Settings Gate]
    |
   yes
    |
    v
[Research Project Entry]
```

### 2. Research project

The user gives one active research goal for the project. The project goal is
the shared target for the manager, workers, verifiers, and final report.

The user-facing model is intentionally singular:

```text
One active project
One research goal
One evolving research task tree
```

The system may keep internal history, but the product should not ask the user to
manage a queue of competing project goals.

### 3. Onboarding and baseline

Before autonomous search begins, the manager reads the codebase and current
durable research state. It should establish enough context to state:

- what the user is asking for
- what the current baseline appears to be
- what assumptions it is making
- what initial search direction it proposes
- what, if anything, blocks it from proceeding

The manager may ask the user a concrete blocking question. If it can proceed,
it calls `create_project_baseline` to create or revise the durable
Manager-owned setup baseline, then calls `present_baseline_for_confirmation`
with that baseline id.

```text
[Research Project]
    |
    v
[Manager Onboarding]
    |
    +--> [Ask User Question]
    |        |
    |        v
    |     [User Answer]
    |        |
    |        v
    |     [Manager Onboarding]
    |
    +--> [create_project_baseline]
             |
             v
          [present_baseline_for_confirmation]
             |
             v
          [User Confirm]
             |
             v
          [Search Workspace Opens]
```

The rest of the research workspace should stay visually gated during onboarding.
After baseline confirmation, the project enters `search` phase, the workspace
opens, and the verified research task tree becomes the center of the app.
`ResearchTask` creation and Scientist dispatch are blocked before `search`, even
if onboarding has already started.

## Verified research task loop

After project phase is `search`, the manager repeatedly plans one or more
research tasks from the current search state. A research task is planned work
with two primary prose instructions:

- a worker prompt: what a scientist should produce
- a verification prompt: what must be checked before the task counts

```text
[Manager]
  reads project, baseline, hypotheses, task tree, evidence, and budget
    |
    v
[Plan ResearchTask]
  explore | exploit | debug | verify | synthesize | prune
    |
    v
[ResearchTask]
  workerPrompt + verificationPrompt
    |
    +-------------------+
    |                   |
    v                   v
[Scientist Worker]   [Verifier]
  executes task        follows verification prompt
  records evidence     records judgment
    |                   |
    +---------+---------+
              |
              v
          [Manager]
      accept | retry | branch | prune | ask user | report
```

A research task should not be considered successful just because the worker
finished. It is successful when verification passes with enough evidence for
the manager to update the search state.

For `verify` ResearchTasks, the task is already Verifier-owned: the
`workerPrompt` is the Verifier assignment, no Scientist worker runs, and the
Verifier records a ResearchTaskVerification directly.

## Research task types

The manager should explicitly choose the type of research task it is creating.
This keeps explore versus exploit intentional while preserving a clear
planner/worker/verifier handoff.

### Explore

Explore tasks look for new promising directions.

Examples:

- generate a new testable hypothesis
- inspect an untested area of the codebase
- branch from an older result that may have been underexplored
- investigate an unexpected measurement

Verification prompt examples:

- hypothesis is not a duplicate
- hypothesis is specific and testable
- proposed experiment would actually test the claim
- novelty is supported by observed context

### Exploit

Exploit tasks deepen a promising branch.

Examples:

- improve a high-scoring experiment
- run a stronger variant of a promising candidate
- refine a hypothesis based on measured evidence
- compare a candidate against a known baseline

Verification prompt examples:

- metric improved against the correct baseline
- improvement is not explained by evaluation leakage
- candidate commit is captured and attributable
- claimed result is linked to evidence

### Debug

Debug tasks recover from failed or flaky branches without losing lineage.

Examples:

- fix a crashed experiment
- isolate a failing command
- rerun a candidate with a smaller reproduction
- repair an invalid measurement

Verification prompt examples:

- the original failure mode is explained
- the debug change does not alter the evaluation to make it easier
- the branch should continue, retry, or be pruned

### Verify

Verify tasks increase confidence in a claim or result.

Examples:

- rerun an experiment
- add a stronger evaluation
- compare candidate output with baseline output
- check for regressions or reward hacking

Verification prompt examples:

- result reproduces
- metric is meaningful for the goal
- measurement is tied to the correct evaluation
- evidence supports the claim being made

### Synthesize

Synthesize tasks make the state legible.

Examples:

- summarize what a branch has shown
- link hypotheses to supporting and refuting evidence
- update the report
- explain why a branch was pruned or promoted

Verification prompt examples:

- claims are linked to evidence
- uncertainty and failures are represented
- summary does not overstate the measurements
- next actions are clear

### Prune

Prune tasks intentionally stop spending budget on a branch.

Examples:

- branch repeatedly fails verification
- branch improves the wrong metric
- branch duplicates a stronger result
- opportunity cost is too high

Verification prompt examples:

- prune reason cites evidence
- promising unresolved alternatives are captured elsewhere
- pruning does not discard the only path to a required user goal

## Hypotheses

Hypotheses are generated throughout the run, not only at the beginning.

They are the semantic map of the research process:

```text
Hypothesis = a testable claim about what might improve or explain the system
Experiment = a concrete attempt to test or act on a hypothesis
Evaluation = the verifier signal for the attempt
Measurement = observed evidence
```

ResearchTasks and hypotheses do not have a single required creation order.
Exploration ResearchTasks may inspect the system first and create hypotheses as
their durable output. Once the run is executing candidate experiments, though,
the ordering becomes strict: every Experiment must name exactly one primary
Hypothesis that it tests.

The manager should be able to create a hypothesis during exploration, target an
existing hypothesis for exploitation, refine a hypothesis after an experiment,
or use a promising hypothesis as the anchor for further work. Hypotheses are
created as durable claims; agents do not separately submit, accept, complete,
fail, or comment on them through lifecycle tools.

The verifier should protect the hypothesis layer from entropy:

- reject duplicates
- reject vague claims
- reject claims with no plausible settling experiment
- flag claims that are unsupported by observed state

Verifier judgments are recorded on the ResearchTask. If a hypothesis-related
check fails, the manager should respond by retrying, pruning, or creating a new
ResearchTask rather than mutating the hypothesis record directly.

## Experiments and lineage

Experiments should form a visible lineage inside the hypothesis search map. A
failed experiment is not merely a dead end; it is a parent for a possible debug
task, or evidence for pruning. The primary hypothesis link is part of the
Experiment record, while secondary relationships can be captured as generic
entity links when useful.

```text
[Experiment E1]
    |
    +--> [Debug child E1.debug]
    |
    +--> [Variant child E1.1]
    |
    +--> [Verification child E1.verify]
```

The manager should be able to move between depth and breadth:

- go deeper when a branch is promising
- jump sideways when results plateau
- return to an older branch when new evidence changes expected value
- stop a branch when verification fails

## Parallelization

Parallelism is a first-class part of the end state. It should be controlled by
the manager's search policy, not by accidental background work.

Useful parallel patterns:

### Frontier parallelism

The manager can dispatch several independent explore tasks when the search
frontier is broad and uncertainty is high.

```text
[Manager]
  |
  +--> [Explore ResearchTask A]
  +--> [Explore ResearchTask B]
  +--> [Explore ResearchTask C]
```

### Variant parallelism

The manager can exploit a promising parent by dispatching multiple variants in
isolated workspaces.

```text
[Promising Experiment]
  |
  +--> [Variant 1]
  +--> [Variant 2]
  +--> [Variant 3]
```

### Verification fanout

One research task can receive multiple verifier passes.

```text
[Worker Result]
  |
  +--> [Metric Verifier]
  +--> [Adversarial Verifier]
  +--> [Regression Verifier]
  +--> [Report Verifier]
```

Parallel work should still converge through the manager. The manager compares
results, updates the search state, and decides the next budget allocation.

## Verification prompts

Every non-trivial research task should define verification before the worker
begins.

A verification prompt should be written as Markdown-style prose and answer:

- what would count as success
- what evidence is required
- what failure modes must be checked
- what would make the result suspicious
- what output the verifier must record

Common verifier profiles:

```text
Hypothesis verifier
  duplicate check, specificity, testability, observed support

Experiment verifier
  tests the intended claim, uses the right baseline, no cheating

Measurement verifier
  metric is meaningful, result is reproducible enough, evidence is linked

Adversarial verifier
  reward hacking, leakage, changed evals, misleading summaries

Report verifier
  claims cite evidence, uncertainty is visible, output is legible
```

The verifier does not need to be a separate agent every time. Some verification
can be deterministic, some can be tool-based, and some can be agentic. The
product contract is that verification is attached to the research task and
recorded as evidence.

## Manager responsibilities

The manager owns the search policy.

It should:

- maintain the active goal and baseline context
- decide explore versus exploit intentionally
- choose which branches receive budget
- define worker prompts
- define verification prompts
- compare verified results
- prune weak branches
- ask the user when blocked
- keep the report legible as evidence accumulates

The manager should not treat all completed work as equal. Verified evidence
should change branch priority; failed verification should reduce confidence or
trigger pruning.

## Scientist responsibilities

Scientists execute concrete worker prompts.

They should:

- create or update the relevant research records
- use isolated workspaces for code experiments
- capture candidate changes
- run the commands needed to produce evidence
- record artifacts and measurements
- avoid making final search-policy decisions

Scientists can propose follow-up observations, but the manager decides whether
those observations become new research tasks.

## Verifier responsibilities

Verifiers check whether a research task should count.

They should:

- read the worker prompt and verification prompt
- inspect the produced evidence
- identify missing evidence
- flag cheating, leakage, duplication, or overclaiming
- produce a clear pass, fail, suspicious, or needs-more-evidence result

Verifier output should be useful even when it fails the task. A failed verifier
result is evidence for debugging, pruning, or changing direction.

Verification status semantics are intentionally simple:

- `passed` verifies the ResearchTask and requires a non-empty evidence summary.
- `failed` and `suspicious` reject the ResearchTask.
- `needs_more_evidence` reopens the ResearchTask as planned work so evidence can
  be gathered before another verification attempt.

Verifiers may also emit advisory `signals` on the verification payload
that ride on top of the verdict. The first such signal is
`suspicious_holdout_divergence`, which the Verifier sets when a
candidate's dev and held-out splits disagree on the same evidence.
The signal does not change the verdict — a candidate can still pass,
fail, or come back as suspicious independently — it advises the
Manager about redesign-versus-discard. When the Manager sees
`suspicious_holdout_divergence` on a verification payload, it files a
redesign exploit task rather than pruning the branch outright.

Verifiers record ResearchTaskVerification rows. They do not create science
records, artifacts, measurements, experiments, or hypothesis lifecycle changes.

## User responsibilities

The user sets the goal and approves the project baseline. After that, the
system should minimize interruptions.

The system should ask the user only when:

- a decision materially changes the research goal
- the manager lacks required context
- verification exposes an ambiguity the system cannot resolve
- the search is about to spend significant budget on a tradeoff

## Legible product surface

The UI should make the search process easy to inspect without exposing every
internal orchestration detail.

Primary surfaces:

- research goal and current phase
- project baseline and assumptions
- active search tree
- hypotheses and their evidence state
- experiments and branch lineage
- verifier results
- measurements and artifacts
- current manager decision
- final report

Internal work queues can exist, but they should not be the user's main mental
model. The product should feel like watching a research search unfold, not like
managing a task board.

## Example loops

### Exploration to verified hypothesis

```text
[Manager]
  chooses explore
    |
    v
[ResearchTask: propose hypothesis]
  workerPrompt: inspect scheduler behavior and propose one testable claim
  verificationPrompt: duplicate + specificity + testability
    |
    v
[Scientist]
  inspects code and durable state
  proposes hypothesis H1
    |
    v
[Verifier]
  records a ResearchTaskVerification that H1 is novel enough and testable
    |
    v
[Manager]
  uses H1 as a target for future exploit or verify tasks
```

### Exploitation to verified improvement

```text
[Manager]
  chooses exploit on promising branch E4
    |
    v
[ResearchTask: improve candidate]
  target: hypothesis H1
  workerPrompt: create one variant of E4 in an isolated worktree
  verificationPrompt: compare against baseline, check eval integrity
    |
    v
[Scientist]
  creates experiment E5 with primary hypothesis H1
  edits code, runs experiment, captures candidate
    |
    v
[Verifier]
  confirms metric improved and eval was not weakened
    |
    v
[Manager]
  promotes branch and may spawn more variants
```

### Failed verification to pruning

```text
[Verifier]
  flags experiment result as suspicious
    |
    v
[Manager]
  chooses verify or prune
    |
    +--> [Verify ResearchTask: reproduce result]
    |
    +--> [Prune ResearchTask: stop branch with evidence]
```

### Synthesis to report

```text
[Manager]
  sees evidence saturation
    |
    v
[ResearchTask: synthesize]
  workerPrompt: produce concise evidence-backed report section
  verificationPrompt: claims linked, uncertainty visible, failures included
    |
    v
[Report]
  summarizes goal, baseline, hypotheses, experiments, evidence, and next steps
```

Reports and pruning rationales can be stored as inline artifacts. In that case,
the artifact body is the source of truth and no real filesystem path is needed.

## End-state feel

The system should feel like a disciplined autonomous research loop:

```text
Set a goal.
Confirm the project baseline.
Watch the verified research task tree unfold.
Inspect evidence and branch decisions.
Receive a report that explains what was tried, what worked, what failed, and why.
```

The global-optimum ambition comes from the combination of search, parallelism,
and verification. Search keeps alternatives alive. Parallelism lets the system
sample the frontier. Verification prevents the system from rewarding invalid
shortcuts. The task tree makes the planner/worker/verifier handoff legible. The
report turns the process into something a human can trust and continue from.
