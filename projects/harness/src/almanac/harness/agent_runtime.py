from __future__ import annotations

from pathlib import Path
from typing import Any

from pydantic_ai import Agent
from pydantic_ai.durable_exec.dbos import DBOSAgent

from .agents.research.agent import (
    RESEARCH_AGENT_INSTRUCTIONS,
    RESEARCH_AGENT_NAME,
    ResearchAgentOutput,
)
from .config import DEFAULTS, AlmanacSecrets
from .core.dbos.runtime import configure_dbos, launch_dbos
from .observability import configure_observability, span
from .repositories import Repositories
from .tools import build_research_toolset
from .tools.common import AlmanacToolDeps


_RUNTIMES: dict[Path, "AgentRuntime"] = {}
AgentPlan = ResearchAgentOutput


class AgentRuntime:
    def __init__(self, project_dir: Path) -> None:
        self.project_dir = project_dir
        configure_observability(project_dir)
        configure_dbos(project_dir)

        secrets = AlmanacSecrets()
        secrets.apply_sdk_environment()
        secrets.require_openai_key()

        self.model_name = DEFAULTS.agent_model
        self.agent: Agent[AlmanacToolDeps, AgentPlan] = Agent(
            self.model_name,
            deps_type=AlmanacToolDeps,
            output_type=AgentPlan,
            instructions=RESEARCH_AGENT_INSTRUCTIONS,
            toolsets=[build_research_toolset()],
            name=RESEARCH_AGENT_NAME,
        )
        self.dbos_agent = DBOSAgent(self.agent, name=RESEARCH_AGENT_NAME)
        launch_dbos()

    def plan_session(
        self,
        *,
        config: dict[str, Any],
        objective: dict[str, Any],
        current_state: dict[str, Any],
        session_id: str | None = None,
        repos: Repositories | None = None,
    ) -> AgentPlan:
        prompt = self._prompt(config=config, objective=objective, current_state=current_state)
        message_history = None
        conversation_id = None
        tool_deps = AlmanacToolDeps(
            session_id=session_id or "session_unscoped",
            project_id=config.get("id"),
            project_dir=self.project_dir,
            repo_path=config.get("repo_path"),
        )
        if session_id is not None and repos is not None:
            stored_messages = repos.agent_message_history.get_message_history(
                session_id,
                agent_name=RESEARCH_AGENT_NAME,
            )
            if stored_messages:
                message_history = repos.agent_message_history.get_model_message_history(
                    session_id,
                    agent_name=RESEARCH_AGENT_NAME,
                )
            else:
                conversation_id = f"almanac:{session_id}:{RESEARCH_AGENT_NAME}"

        with span(
            "almanac.agent.plan",
            workspace=config.get("repo_path", ""),
            objective=objective.get("title", ""),
        ):
            result = self.dbos_agent.run_sync(
                prompt,
                deps=tool_deps,
                message_history=message_history,
                conversation_id=conversation_id,
            )
        if session_id is not None and repos is not None:
            repos.agent_message_history.append_session_messages(
                session_id=session_id,
                agent_name=RESEARCH_AGENT_NAME,
                messages_json=result.new_messages_json(),
                pydantic_run_id=getattr(result, "run_id", None),
                conversation_id=getattr(result, "conversation_id", None),
            )
        return result.output

    def _prompt(
        self,
        *,
        config: dict[str, Any],
        objective: dict[str, Any],
        current_state: dict[str, Any],
    ) -> str:
        recent_hypothesis_activity = current_state.get("hypothesis_activities", [])[-5:]
        recent_experiment_activity = current_state.get("experiment_activities", [])[-5:]
        return "\n".join(
            [
                f"Objective: {objective.get('title', '')}",
                f"Objective details: {objective.get('description', '')}",
                f"Research context: {config.get('research_context', '')}",
                f"Recent hypothesis activity: {recent_hypothesis_activity}",
                f"Recent experiment activity: {recent_experiment_activity}",
                "Return a short plan for the next proposal round.",
            ]
        )


def get_agent_runtime(project_dir: Path) -> AgentRuntime:
    key = project_dir.resolve()
    runtime = _RUNTIMES.get(key)
    if runtime is None:
        runtime = AgentRuntime(project_dir)
        _RUNTIMES[key] = runtime
    return runtime
