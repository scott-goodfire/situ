# Agent Voice

Situ's agents write durable research records — analyses, hypotheses,
experiments, evaluations, measurements, activities, task content, completion
summaries. These records are the product surface humans read while the loop
runs and after it stops. Their voice is part of the product.

This spec defines the end-state shape of that voice: what reads naturally,
where the contract is owned, and what stays machine-shaped on purpose. Tone
adjectives (`be concise`, `sound natural`) do not produce naturalness;
behavioral drafting rules and concrete per-tool examples do. The contract
is built around those two pieces.

[`../0008-agent-facing-context/SPEC.md`](../0008-agent-facing-context/SPEC.md)
defines what records exist and what tools agents call to write them. This
spec narrows that by fixing how the prose inside those records reads.
[`../0010-activities-and-artifacts/SPEC.md`](../0010-activities-and-artifacts/SPEC.md)
defines activity kinds; this spec narrows the body language used inside
each.

## What Reads Like A Researcher's Notebook

The records an agent writes read the way a senior engineer or research
practitioner writes when annotating their own work: leading with the
finding, citing specific record IDs inline, naming what the data showed
rather than declaring abstract conclusions, and leaving routine narration
out of durable artifacts.

Robotic features are absent: no preamble paragraphs, no closing summaries
that restate what was just said, no template phrases that signal the text
came from a model rather than a person, no list-of-bullets answer to a
question that was not a list.

## Voice Contract

The voice contract has two pieces:

1. **Shared drafting rules** — a small list of behavioral rules that
   constrain how prose is written. Stable across all four agents.
2. **Per-tool examples** — 3–5 hand-tuned examples in the docstring of
   each tool that produces voice-bearing prose. Each example is on-topic
   for that specific tool's output field.

The two pieces sit at different layers of the prompt: the drafting rules
land in every agent's system prompt, while per-tool examples reach the
model through Pydantic AI's tool-description channel at tool-selection
time.

### Drafting Rules

The drafting rules are behavioral, not lexical. They describe what the
prose does, not which words it avoids. The rule set stays small enough to
hold in working memory while writing:

- Write in complete sentences with explicit subjects. Use first-person
  pronouns where natural ("I ran", "I'm not convinced", "I'm going to
  close this as inconclusive"). Telegraphed fragments like "Closing as
  inconclusive." or "Worth a follow-up." read like bullet points, not
  prose.
- Lead with the finding or the action, but say it as a sentence. Skip the
  preamble paragraph that frames what is about to be said.
- Cite specific record IDs (`H3`, `EX7`, `EV2`, `M11`, `T44`) inline when
  referring to them. Numbers carry units.
- Name what the data showed. Avoid abstract conclusions that float free of
  the cited evidence.
- Basic Markdown is available in voice-bearing fields: `**bold**`, `_italic_`,
  inline `code`, fenced code blocks, bullets, numbered lists, links, and small
  tables. Use formatting to make technical notes easier to scan. Headings are
  used sparingly inside record bodies because the record page already supplies
  the page structure.
- Match the register of an engineer explaining the work to a peer in a
  shared issue tracker or design doc. Not a report. Not chat banter.
- Routine tool-call narration ("I will now call X") does not belong in
  durable record bodies. Activities and analyses describe what was
  learned, not what was clicked.

The "complete sentences with explicit subjects" rule is load-bearing. The
model's default register is bullet-fragment text, and that register reads
as machine output. Forcing complete sentences with first-person pronouns
is what makes the rest of the contract land.

### Per-Tool Examples

Every tool that produces voice-bearing prose carries 3–5 hand-tuned
examples in its docstring, wrapped in `<example field="...">` tags. The
examples are on-topic for that specific tool's output:

- `create_analysis` examples are full analysis-content writeups.
- `create_hypothesis` examples are paired title-and-summary blocks.
- `add_analysis_comment` examples are comments specifically about
  analysis records, not generic engineering remarks.
- `add_hypothesis_comment` examples are comments about claim shape,
  testability, and scope.
- `add_baseline_comment` examples are remarks on reference evidence —
  what the baseline measured, whether it is comparable, what future
  candidate runs should preserve.
- `add_experiment_comment` examples are comments on candidate runs and
  their evidence.
- `add_task_comment` examples are coordination remarks (claiming, blocking,
  pausing).
- `add_measurement` examples are observational result writeups with raw
  numbers inline.
- `create_task` examples are work-order content with stated scope.
- `complete_task` examples are completion summaries.

Status-transition tools that accept an optional comment field
(`submit_*`, `accept_*`, `complete_*`, `cancel_*`, `fail_*`) inherit the
voice from the parent record's comment tool. The transition tool's own
docstring stays short — it documents the from-state precondition and
the activity it records, not the comment voice.

Per-tool examples are the right home for voice samples because they sit
next to the field they teach, the maintainer sees them at the point of
edit, and they cannot drift from the tool they describe.

### Example Source

Examples are calibrated to the register of real human-authored
engineering discourse: GitHub issues, pull request descriptions,
design-doc threads, public roadmaps, engineering forum posts, and similar
archives where engineers write to other engineers about their work. They
carry the spelling, line breaks, and register conventions of those
sources — not perfectly polished prose, not template language. Verbatim
quotes with light editing are preferred where a real-source sample fits
the autoresearch domain cleanly. Hand-written examples in the same
register are acceptable where no source sample fits, provided they avoid
the model-default register the contract is designed to displace (no
preamble, no closing summary, no template phrasing, no list-of-bullets
when a paragraph fits).

## What Each Agent Produces

The voice contract applies to every agent that writes durable prose.
Manager, Researcher, Scientist, and Critic all produce text that humans
read in record bodies and activity timelines. The shared drafting rules
are identical across the four. Each agent encounters the relevant
per-tool examples through the toolset bound to it.

## Where The Contract Is Owned

The shared drafting rules live in a single module under the agent
runtime; each agent's prompt builder prepends them to the agent's core
instruction text. Per-tool examples live in each tool's docstring next
to the field they teach.

A change to the drafting rules takes effect for every agent on the next
prompt build. A change to a tool's examples takes effect for every agent
that uses that tool.

## Out Of Scope

Several surfaces look adjacent but stay machine-shaped:

- **Status fields, kinds, and other enums.** `status`, `kind`,
  `activity_type`, `source_kind`, and `work_type` values remain canonical
  string tokens (`active`, `done`, `comment`, `manager`). They are
  machine-read.
- **Tool argument JSON, return JSON, and the structured `payload` field
  of activities and measurements.** These are protocol surfaces. The
  human-facing prose lives in the body alongside the structured payload,
  not inside it.
- **Tool error messages.** Failure messages stay diagnostic and precise
  so agents and humans can act on them. They remain out of the voice
  contract.
- **Pydantic `Field(description=...)` strings.** These appear in the
  generated JSON schema and in the tool-call surface. They stay technical
  to keep the schema readable for both humans and automated consumers.
- **Internal event messages.** Event `type` and `message` fields describe
  runtime state for debugging and timelines. They stay machine-shaped.
- **Tools that don't produce voice-bearing artifacts.** Read tools
  (`get_*`, `list_*`, `search_*`), status-transition tools (`accept_*`,
  `complete_*` when they take no body field), and link/lookup tools have
  short technical docstrings without example blocks.

## Review Criteria

- The drafting rules live in one module and are imported by every agent's
  prompt builder. No agent's core instruction text carries its own
  `Style:` voice rules.
- Every tool that produces voice-bearing prose carries 3–5
  `<example field="...">` blocks in its docstring, on-topic for that
  tool's output.
- Examples read in the register of real human engineering discourse:
  complete sentences with explicit subjects, first-person where natural,
  cited record IDs inline, no preamble or closing-summary boilerplate.
- Status enums, payload JSON, error messages, schema field descriptions,
  and event messages remain machine-shaped.
- Agent output observed in eval traces and live runs is free of preamble
  paragraphs, restated closing summaries, and the template registers the
  contract displaces.
- Voice-bearing fields can use basic Markdown, and the web monitor renders it
  in a restrained record-note style.
