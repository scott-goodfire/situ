from __future__ import annotations

from ...records import AgentKind, TaskKind, parse_agent_kind

ELIGIBLE_TASK_KINDS: dict[AgentKind, tuple[TaskKind, ...]] = {
    AgentKind.MANAGER: (TaskKind.PLAN,),
    AgentKind.RESEARCHER: (
        TaskKind.RESEARCH,
        TaskKind.HYPOTHESIZE,
        TaskKind.INTERPRET,
    ),
    AgentKind.SCIENTIST: (
        TaskKind.BASELINE,
        TaskKind.EXPERIMENT,
    ),
    AgentKind.CRITIC: (TaskKind.REVIEW,),
}


def eligible_task_kinds_for_agent(kind: AgentKind | str) -> tuple[TaskKind, ...]:
    return ELIGIBLE_TASK_KINDS[parse_agent_kind(kind)]
