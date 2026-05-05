# Agent-Facing Context

Almanac should be useful to agents as well as humans.

Agents should not have to infer durable research state from an ever-growing chat
transcript. Almanac should expose compact, current, machine-readable context.

## Agent Questions

An agent should be able to ask:

- What is the current objective?
- What evaluation context is relevant?
- Which hypotheses are open or active?
- What has already been tried?
- Which experiments relate to which hypotheses?
- What result activities came back?
- What concern activities apply?
- What artifacts can be inspected?
- What is running now?

## Candidate CLI/API Surface

The exact interface can evolve, but the product should support commands like:

```bash
almanac status --json
almanac session --json
almanac hypotheses --json
almanac experiments --json
almanac events --json
```

Defer richer guidance and proposal-context commands until the basic loop is
working.

## Session Context

The compact session context, exposed to agents through tools such as
`get_session`, should include:

- Objective
- Evaluation context
- Current session status
- Active hypotheses
- Recent experiments
- Hypothesis/experiment links
- Recent hypothesis activities
- Recent experiment activities
- Recent concerns/results/decisions
- Artifact references
- Internal events when useful

Agent-facing write tools should stay close to the product models:
`create_hypothesis`, `update_hypothesis`, `create_experiment`,
`update_experiment`, `link_hypothesis_experiment`,
`add_hypothesis_comment`, and `add_experiment_comment`. Comments can be stored
as typed activities internally, but the tool surface should not ask the model to
choose generic activity kinds for routine collaboration.

## Product Rule

Almanac owns durable research context. Agent prompts can be creative, but they
should not be the only place where the research contract lives.
