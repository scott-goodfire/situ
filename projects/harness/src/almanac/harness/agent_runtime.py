from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from pydantic_ai import Agent
from pydantic_ai.durable_exec.dbos import DBOSAgent

from .agents.research.agent import (
    RESEARCH_AGENT_NAME,
    ResearchAgentOutput,
)
from .agents.research.prompt import (
    RESEARCH_AGENT_INSTRUCTIONS,
    build_proposal_round_prompt,
    build_session_run_prompt,
)
from .config import DEFAULTS, AlmanacSecrets
from .core.dbos.runtime import configure_dbos, launch_dbos
from .observability import configure_observability, span
from .repositories import Repositories
from .tools import build_research_toolset, build_workspace_toolset
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

        self.model_name = os.environ.get("ALMANAC_AGENT_MODEL", DEFAULTS.agent_model)
        self.agent: Agent[AlmanacToolDeps, AgentPlan] = Agent(
            self.model_name,
            deps_type=AlmanacToolDeps,
            output_type=AgentPlan,
            instructions=RESEARCH_AGENT_INSTRUCTIONS,
            toolsets=[
                build_research_toolset(),
                build_workspace_toolset(),
            ],
            name=RESEARCH_AGENT_NAME,
        )
        self.dbos_agent = DBOSAgent(self.agent, name=RESEARCH_AGENT_NAME)
        launch_dbos()

    def plan_session(
        self,
        *,
        project: dict[str, Any],
        setup_objective: str,
        setup_research_context: str,
        current_state: dict[str, Any],
        session_id: str | None = None,
        repos: Repositories | None = None,
    ) -> AgentPlan:
        prompt = build_proposal_round_prompt(
            setup_objective=setup_objective,
            setup_research_context=setup_research_context,
            current_state=current_state,
        )
        message_history = None
        conversation_id = None
        tool_deps = AlmanacToolDeps(
            session_id=session_id or "session_unscoped",
            project_id=project.get("id"),
            project_dir=self.project_dir,
            repo_path=project.get("repo_path"),
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
            workspace=project.get("repo_path", ""),
            objective=setup_objective,
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

    def run_session(
        self,
        *,
        project: dict[str, Any],
        setup_objective: str,
        setup_research_context: str,
        current_state: dict[str, Any],
        session_id: str,
        max_experiments: int,
        app_root: Path | None = None,
        repos: Repositories | None = None,
    ) -> AgentPlan:
        prompt = build_session_run_prompt(
            setup_objective=setup_objective,
            setup_research_context=setup_research_context,
            current_state=current_state,
            max_experiments=max_experiments,
        )
        message_history = None
        conversation_id = None
        tool_deps = AlmanacToolDeps(
            session_id=session_id,
            project_id=project.get("id"),
            project_dir=self.project_dir,
            repo_path=project.get("repo_path"),
            app_root=app_root,
        )
        if repos is not None:
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
            "almanac.agent.session",
            workspace=project.get("repo_path", ""),
            objective=setup_objective,
            session_id=session_id,
        ):
            result = self.dbos_agent.run_sync(
                prompt,
                deps=tool_deps,
                message_history=message_history,
                conversation_id=conversation_id,
            )
        if repos is not None:
            repos.agent_message_history.append_session_messages(
                session_id=session_id,
                agent_name=RESEARCH_AGENT_NAME,
                messages_json=result.new_messages_json(),
                pydantic_run_id=getattr(result, "run_id", None),
                conversation_id=getattr(result, "conversation_id", None),
            )
        return result.output


def get_agent_runtime(project_dir: Path) -> AgentRuntime:
    key = project_dir.resolve()
    runtime = _RUNTIMES.get(key)
    if runtime is None:
        runtime = AgentRuntime(project_dir)
        _RUNTIMES[key] = runtime
    return runtime
