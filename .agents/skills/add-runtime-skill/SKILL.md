---
name: add-runtime-skill
description: Use when adding a runtime skill exposed to Situ's inner agents (Manager / Researcher / Scientist / Critic). Covers role placement, SKILL.md frontmatter and structure, registry wiring, package data, and discovery tests.
---

# Add Runtime Skill

Use this skill when adding a runtime skill to the Situ harness — the kind
that Situ's own Manager, Researcher, Scientist, or Critic agents load on
demand during an autoresearch session. These are different from the
developer-agent skills under `.agents/skills/` (this file is one of those).

The contract for runtime skills is fixed by
[`../../policies/0025-runtime-skills/POLICY.md`](../../policies/0025-runtime-skills/POLICY.md).
Read it before writing the skill; the policy is the review rubric.

The agent-facing context surface that runtime skills compose with is
described in
[`../../specs/0008-agent-facing-context/SPEC.md`](../../specs/0008-agent-facing-context/SPEC.md).

## When A Runtime Skill Is The Right Answer

Add a runtime skill when:

- A role keeps repeating the same multi-step methodology in agent prompts
  or task content, and that methodology is reusable across sessions.
- A new agent-executable `TaskKind` is being added — per policy 0025,
  every executable task kind has a default skill, or the change adding
  the kind explicitly explains why the role prompt and toolset are
  enough.
- The methodology is procedural — what to read, what to write, what to
  link, and how to complete the work — and currently bloats a role
  prompt that should stay slim.

Do not add a runtime skill when:

- The work is one-off and won't repeat. A task body is enough.
- The text would just paraphrase the role prompt or the toolset
  instructions. Skills are for methodology, not voice.
- The skill would grant capabilities outside the role's normal toolset
  (per 0025: skills must respect role boundaries).

## Decide The Role And Location

Runtime skills live under
`projects/harness/src/situ/harness/agent_skills/<role-or-shared>/<skill-name>/SKILL.md`.

Pick the role:

- `manager/` — planning, task decomposition, replanning from Critic
  reviews
- `researcher/` — analysis, prior art, hypothesis handoff
- `scientist/` — baseline, experiment, interpret task execution
- `critic/` — review of experiments, hypotheses, analyses, baselines,
  evaluations
- `shared/` — methodology used by more than one role (`task-execution`,
  `source-grounding`, etc.). Avoid `shared/` unless the skill genuinely
  applies to multiple roles.

The skill name is kebab-cased and unique within its role/shared
namespace.

## Write The SKILL.md

Frontmatter is required (per policy 0025):

```yaml
---
name: my-skill-name
description: Use when <one-sentence trigger condition>.
---
```

The `description` is what the role prompt advertises and what the agent
reads when deciding whether to load the skill. It should name the
trigger condition concretely, not the methodology itself.

Structure the body to follow existing conventions:

```markdown
# My Skill Name

## Method

1. Numbered steps of what to do.
2. Name explicit Situ tools the agent should call (`get_task`,
   `get_project_overview`, `create_analysis`, etc.) — runtime skills do
   not replace ordinary tool reads and writes.
3. Cite the durable record kinds the skill writes (Analysis, Hypothesis,
   Experiment, etc.).

## Good Output

- What the durable artifact this skill produces should look like.
- What evidence backs interpretive claims.
- What the next task should be when this skill's work is done.
```

Read existing skills under `agent_skills/<role>/` for register and
length conventions. Most are 30–80 lines. Bigger than that is usually a
sign the skill is doing two jobs.

The voice register inside the SKILL.md follows
[`../../specs/0020-agent-voice/SPEC.md`](../../specs/0020-agent-voice/SPEC.md):
complete sentences, name explicit tools, no telegraphed fragments. The
skill is read by the agent; clarity matters.

## Verify Registry Discovery

Skills are discovered by `pydantic_ai_skills.SkillsCapability` from the
directories wired up in
`projects/harness/src/situ/harness/agent_skills/registry.py`. Each role
gets its own builder:

- `build_manager_skill_capabilities()` reads `shared/` + `manager/`
- `build_scientist_skill_capabilities()` reads `shared/` + `scientist/`
- `build_researcher_skill_capabilities()` reads `shared/` + `researcher/`
- `build_critic_skill_capabilities()` reads `shared/` + `critic/`

Adding a skill in the right role directory is the registration —
`SkillsCapability` walks the directory and picks up SKILL.md files
automatically. Do not edit `registry.py` for routine additions; only
edit it if the skill needs a new role bucket or a non-default depth.

## Package Data

The harness ships skills as markdown package data via
`projects/harness/pyproject.toml`:

```toml
[tool.setuptools.package-data]
"situ.harness.agent_skills" = ["**/*.md"]
```

This pattern is already in place — new SKILL.md files under
`agent_skills/` are picked up automatically. Verify after adding a
skill by running the bundled-runtime test:

```bash
uv run --project projects/harness pytest projects/harness/tests/test_bundled_runtime.py
```

## Tests

Per policy 0025, runtime skills must be covered by either deterministic
discovery or a realistic eval:

- **Discovery test** — `tests/test_agent_runtime.py` parameterizes over
  the four roles and asserts the expected skill names show up in each
  agent's `SkillsToolset`. Add the new skill name to the expected set
  for the role it belongs to.
- **Realistic eval** — if behavior depends on the skill being loaded
  during a real run, add or extend an eval case in
  `evals/suites/agents/<suite>/cases.yaml` that asserts the skill was
  loaded (Pydantic AI's load primitive shows up in tool-call traces).
  Live evals require `SITU_ANTHROPIC_KEY` + `SITU_LOGFIRE_TOKEN`.

Run the deterministic suite to confirm:

```bash
uv run --project projects/harness pytest projects/harness/tests/test_agent_runtime.py
```

## Update Specs/Prompts If The Surface Shifts

Adding a skill that defines a new task-kind execution procedure may also
shape the role prompt. Read
`projects/harness/src/situ/harness/agents/research/prompt.py` and look
for the `Method`-style guidance the new skill replaces. Move that
methodology out of the prompt into the skill so the prompt stays slim.

If the skill teaches a new product action (a new artifact kind, a new
review pattern), check
[`../../specs/0008-agent-facing-context/SPEC.md`](../../specs/0008-agent-facing-context/SPEC.md)
and
[`../../specs/0010-activities-and-artifacts/SPEC.md`](../../specs/0010-activities-and-artifacts/SPEC.md)
for spec drift. Routine additions usually don't move the spec.

## Boundary Reminder

`.agents/skills/*` (where this file lives) is for developer agents
maintaining this repo.
`projects/harness/src/situ/harness/agent_skills/*` is for runtime skills
exposed to Situ's own agents. Never mix the two trees — policy 0025 and
policy 0017 both call this out as a red flag.
