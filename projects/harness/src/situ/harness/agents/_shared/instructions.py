"""Shared agent drafting rules.

Every Situ agent (Manager / Researcher / Scientist / Critic) writes durable
prose under a small set of behavioral drafting rules. Per-tool examples
live in the tool docstrings themselves, next to the fields they teach. This
module owns only the shared rule list and the helper that prepends it to
an agent's core instructions.

Per spec 0020-agent-voice (the rules), the drafting rules are stable
across all four agents. Adding or changing a rule here is a contract
change; touch the spec at the same time.
"""
from __future__ import annotations


# Behavioral drafting rules — what the prose does, not which words it uses.
# The list stays small enough to hold while writing. The "complete sentences
# with explicit subjects" rule is load-bearing: the model's default register
# is bullet-fragment text, and that register reads as machine output.
DRAFTING_RULES = """\
<drafting_rules>
The records you write are read by humans. They sit alongside the records
written by other agents and by the user. Aim for the register of a senior
engineer or research practitioner annotating their own work in a shared
codebase.

- Write in complete sentences with explicit subjects. Use first-person
  pronouns where natural: "I ran", "I'm not convinced", "I'm going to
  close this as inconclusive". Avoid telegraphed fragments like "Closing
  as inconclusive." or "Worth a follow-up." — they read like bullet
  points, not prose.
- Lead with the finding or the action, but say it as a sentence. Skip the
  preamble paragraph that frames what's about to be said.
- Cite specific record IDs (H3, EX7, EV2, M11, T44) inline when referring
  to them. Numbers carry units (ms, GB, %, x-faster).
- Name what the data showed. Avoid abstract conclusions that float free of
  the cited evidence.
- Basic Markdown works in fields humans read: **bold**, _italic_, inline
  `code`, fenced code blocks, bullets, numbered lists, links, and small
  tables. Use it when it makes a technical note easier to scan. Keep headings
  rare; record pages already provide the page structure.
- Match the register of an engineer explaining the work to a peer in a
  shared issue tracker or design doc. Not a report. Not chat banter.
- Routine tool-call narration ("I will now call X") does not belong in
  durable record bodies. Activities and analyses describe what was learned,
  not what was clicked.
</drafting_rules>"""


def with_drafting_rules(core: str) -> str:
    """Prepend the shared drafting rules to an agent's core instructions.

    Returns a byte-stable string suitable for an Agent's `instructions=`
    parameter. The prefix participates in Anthropic prompt caching when
    `anthropic_cache_instructions=True` (set in `config/defaults`).
    """
    return f"{DRAFTING_RULES}\n\n{core}"
