from __future__ import annotations

import inspect
from typing import Any

RESEARCH_AGENT_INSTRUCTIONS = inspect.cleandoc(
    """
    You are Situ's research agent.

    Situ is a local-first terminal observability layer for autoresearch
    sessions. Your job is to keep the session understandable while work is
    happening: what the objective is, which hypotheses are active, which
    experiments have been tried, what the evidence says, and what should happen
    next.

    Session kickoff:
    - On the first turn of a session, populate the session's objective and
      research context records from the free-text setup input. Call
      `create_objective` (1:1 with the session) and `create_research_context`
      (1:1 with the session). Both tools are idempotent: they return the
      existing record if already populated, so it is safe to call them at the
      start of every turn.

    How you work:
    - Start from the current session state before making claims.
    - Treat objectives, hypotheses, experiments, activities, and artifacts as
      the research record.
    - Treat evaluations as the measurement record: baseline evidence,
      candidate benchmark evidence, reproductions, sanity checks, and blocked
      setup attempts.
    - Use the workspace tools to inspect files and run project-native commands.
      Run ordinary evals/tests/benchmarks with `execute`; do not expect a
      special Situ eval script.
    - Use `inspect_workspace_state` before baseline interpretation and after
      candidate workspace changes. Include the eval command when known.
    - Before proposing candidate changes as comparable, establish baseline
      evidence with an evaluation and an evaluation result.
    - Create or update hypotheses when they clarify the line of investigation.
    - Create or update experiments when there is a concrete thing to try.
    - Create or update evaluations when there is a concrete measurement thread.
    - Link experiments back to the hypotheses they probe.
    - Record command output as plaintext evidence in evaluation results when
      it matters. Interpret it with the LLM; do not rely on deterministic
      metric parsing.
    - Leave comments only for useful research judgment: what changed, what was
      learned, what looks risky, or what should be tried next.
    - Do not turn routine bookkeeping into comments.

    Grounding:
    - Distinguish evidence from guesses.
    - Do not say an experiment worked unless recorded results or artifacts
      support it.
    - Treat automated concerns and suspicious results as first-class research
      context.
    - Treat dirty starts, test/eval changes, dependency changes, generated-file
      clutter, changed eval commands, changed interpreters, and changed test
      counts as comparability concerns unless the record explains why they are
      intended.
    - When the next step is uncertain, say what would make it worth running.

    Style:
    - Be direct, concise, and human.
    - Write like a sharp teammate reviewing a research board, not a workflow
      engine narrating its own tool calls.
    - Prefer specific next steps over generic advice.
    """
)

DEFAULT_RESEARCH_AGENT_USER_PROMPT = inspect.cleandoc(
    """
    Look over the current session. Summarize what we know, write down only the
    notes that will help the next pass, and recommend the next focus.
    """
)


def build_research_agent_user_prompt(
    *,
    objective: str,
    request: str | None = None,
) -> str:
    normalized_objective = objective.strip() or "No objective provided."
    normalized_request = (request or DEFAULT_RESEARCH_AGENT_USER_PROMPT).strip()
    return "\n".join(
        [
            "Objective",
            normalized_objective,
            "",
            "Request",
            normalized_request,
        ]
    )


def build_proposal_round_prompt(
    *,
    setup_objective: str,
    setup_research_context: str,
    current_state: dict[str, Any],
) -> str:
    objective = current_state.get("objective") or {}
    research_context = current_state.get("research_context") or {}
    objective_title = objective.get("title", "") or setup_objective
    objective_description = objective.get("description", "") or setup_objective
    research_context_body = research_context.get("body", "") or setup_research_context
    recent_hypothesis_activity = current_state.get("hypothesis_activities", [])[-5:]
    recent_experiment_activity = current_state.get("experiment_activities", [])[-5:]
    return inspect.cleandoc(
        f"""
        Setup inputs (free-text from the user)
        Objective: {setup_objective}
        Research context: {setup_research_context}

        On the first turn, persist these into the session by calling
        `create_objective` and `create_research_context`. Both are idempotent.

        Objective (record)
        {objective_title}

        Objective details
        {objective_description}

        Research context (record)
        {research_context_body}

        Recent hypothesis activity
        {recent_hypothesis_activity}

        Recent experiment activity
        {recent_experiment_activity}

        Look over the session and return a short plan for the next proposal
        round. Make clear what is known, what is still uncertain, and what
        would make the next experiment worth running. If there is no baseline
        evaluation evidence, make that the next focus before candidate
        hypotheses get more specific.
        """
    )


def build_session_run_prompt(
    *,
    setup_objective: str,
    setup_research_context: str,
    current_state: dict[str, Any],
    max_experiments: int,
) -> str:
    objective = current_state.get("objective") or {}
    research_context = current_state.get("research_context") or {}
    objective_title = objective.get("title", "") or setup_objective
    objective_description = objective.get("description", "") or setup_objective
    research_context_body = research_context.get("body", "") or setup_research_context
    recent_hypothesis_activity = current_state.get("hypothesis_activities", [])[-8:]
    recent_experiment_activity = current_state.get("experiment_activities", [])[-8:]
    return inspect.cleandoc(
        f"""
        Setup inputs (free-text from the user)
        Objective: {setup_objective}
        Research context: {setup_research_context}

        On the first turn, persist these into the session by calling
        `create_objective` and `create_research_context`. Both are idempotent.

        Objective (record)
        {objective_title}

        Objective details
        {objective_description}

        Research context (record)
        {research_context_body}

        Budget for this pass
        Run at most {max_experiments} experiments.

        Recent hypothesis activity
        {recent_hypothesis_activity}

        Recent experiment activity
        {recent_experiment_activity}

        Continue the research from the live session state. Check the session
        first, then inspect workspace state. Create or update hypotheses only
        when they make the board clearer. If baseline evaluation evidence is
        missing, create a baseline evaluation, inspect workspace state with the
        intended eval command, run the project-native command with the
        workspace `execute` tool, and record useful plaintext output plus your
        interpretation as an evaluation result before trying candidate changes.

        For concrete candidate attempts, create or update an experiment for the
        attempted change, create or update an evaluation for the measurement,
        inspect workspace state before interpreting the candidate, run the
        project-native command with the workspace `execute` tool, and record
        useful plaintext output plus workspace-state context and your
        interpretation as an evaluation result. Use experiment comments for
        what changed, whether source/tests/evals/dependencies/generated files
        changed, and what the evaluation means for that experiment.

        Stop when the budget is reached, when the next experiment is not
        justified by the record, or when the evidence says the session needs
        human review. Do not invent results.
        """
    )
