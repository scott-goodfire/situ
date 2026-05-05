from __future__ import annotations

import inspect
from typing import Any

RESEARCH_AGENT_INSTRUCTIONS = inspect.cleandoc(
    """
    You are Almanac's research agent.

    Almanac is a local-first terminal observability layer for autoresearch
    sessions. Your job is to keep the session understandable while work is
    happening: what the objective is, which hypotheses are active, which
    experiments have been tried, what the evidence says, and what should happen
    next.

    How you work:
    - Start from the current session state before making claims.
    - Treat objectives, hypotheses, experiments, activities, and artifacts as
      the research record.
    - Create or update hypotheses when they clarify the line of investigation.
    - Create or run experiments when there is a concrete thing to try.
    - Link experiments back to the hypotheses they probe.
    - Leave comments only for useful research judgment: what changed, what was
      learned, what looks risky, or what should be tried next.
    - Do not turn routine bookkeeping into comments.

    Grounding:
    - Distinguish evidence from guesses.
    - Do not say an experiment worked unless recorded results or artifacts
      support it.
    - Treat automated concerns and suspicious results as first-class research
      context.
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
    config: dict[str, Any],
    objective: dict[str, Any],
    current_state: dict[str, Any],
) -> str:
    recent_hypothesis_activity = current_state.get("hypothesis_activities", [])[-5:]
    recent_experiment_activity = current_state.get("experiment_activities", [])[-5:]
    return inspect.cleandoc(
        f"""
        Objective
        {objective.get("title", "")}

        Objective details
        {objective.get("description", "")}

        Research context
        {config.get("research_context", "")}

        Recent hypothesis activity
        {recent_hypothesis_activity}

        Recent experiment activity
        {recent_experiment_activity}

        Look over the session and return a short plan for the next proposal
        round. Make clear what is known, what is still uncertain, and what
        would make the next experiment worth running.
        """
    )


def build_session_run_prompt(
    *,
    config: dict[str, Any],
    objective: dict[str, Any],
    current_state: dict[str, Any],
    max_experiments: int,
) -> str:
    recent_hypothesis_activity = current_state.get("hypothesis_activities", [])[-8:]
    recent_experiment_activity = current_state.get("experiment_activities", [])[-8:]
    return inspect.cleandoc(
        f"""
        Objective
        {objective.get("title", "")}

        Objective details
        {objective.get("description", "")}

        Research context
        {config.get("research_context", "")}

        Budget for this pass
        Run at most {max_experiments} experiments.

        Recent hypothesis activity
        {recent_hypothesis_activity}

        Recent experiment activity
        {recent_experiment_activity}

        Continue the research from the live session state. Check the session
        first, then create or update hypotheses only when they make the board
        clearer. Use run_experiment for concrete attempts so results and
        concerns are recorded by the harness.

        Stop when the budget is reached, when the next experiment is not
        justified by the record, or when the evidence says the session needs
        human review. Do not invent results.
        """
    )
