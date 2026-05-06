from __future__ import annotations

from pathlib import Path
from typing import Any

from pydantic_ai import Agent
from pydantic_ai.durable_exec.dbos import DBOSAgent

from .agents.research.agent import (
    RESEARCH_AGENT_NAME,
    ResearchAgentOutput,
)
from .agents.research.prompt import (
    MANAGER_AGENT_INSTRUCTIONS,
    RESEARCH_AGENT_INSTRUCTIONS,
    build_proposal_round_prompt,
    build_session_run_prompt,
)
from .config import DEFAULTS, SituSecrets
from .core.dbos.runtime import configure_dbos, launch_dbos
from .core.observability import configure_observability, span
from .repositories import Repositories
from .tools import build_manager_toolset, build_research_toolset, build_workspace_toolset
from .tools.common import SituToolDeps


_RUNTIMES: dict[Path, "AgentRuntime"] = {}
AgentPlan = ResearchAgentOutput
MANAGER_AGENT_NAME = "situ-manager-agent"


class AgentRuntime:
    def __init__(self, project_dir: Path) -> None:
        self.project_dir = project_dir
        configure_observability(project_dir)
        configure_dbos(project_dir)

        secrets = SituSecrets()
        secrets.apply_sdk_environment()
        secrets.require_openai_key()

        self.model_name = DEFAULTS.agent_model
        self.agent: Agent[SituToolDeps, AgentPlan] = Agent(
            self.model_name,
            deps_type=SituToolDeps,
            output_type=AgentPlan,
            instructions=RESEARCH_AGENT_INSTRUCTIONS,
            toolsets=[
                build_research_toolset(),
                build_workspace_toolset(),
            ],
            model_settings=DEFAULTS.model_settings(),
            name=RESEARCH_AGENT_NAME,
        )
        self.dbos_agent = DBOSAgent(self.agent, name=RESEARCH_AGENT_NAME)
        self.manager_agent: Agent[SituToolDeps, AgentPlan] = Agent(
            self.model_name,
            deps_type=SituToolDeps,
            output_type=AgentPlan,
            instructions=MANAGER_AGENT_INSTRUCTIONS,
            toolsets=[build_manager_toolset()],
            model_settings=DEFAULTS.model_settings(),
            name=MANAGER_AGENT_NAME,
        )
        self.dbos_manager_agent = DBOSAgent(self.manager_agent, name=MANAGER_AGENT_NAME)
        launch_dbos()

    def plan_session(
        self,
        *,
        workspace: dict[str, Any],
        setup_objective: str,
        setup_research_context: str,
        current_state: dict[str, Any],
        session_id: str | None = None,
        repos: Repositories | None = None,
        active_task: dict[str, Any] | None = None,
    ) -> AgentPlan:
        prompt = build_proposal_round_prompt(
            setup_objective=setup_objective,
            setup_research_context=setup_research_context,
            current_state=current_state,
            active_task=active_task,
        )
        message_history = None
        conversation_id = None
        project_id = None
        agent_id = None
        if session_id is not None and repos is not None:
            session = repos.sessions.get(session_id)
            project_id = session.project_id if session is not None else None
            if project_id is not None:
                agent = repos.agents.ensure_project_agent(
                    project_id=project_id,
                    created_in_session_id=session_id,
                    kind="manager",
                    display_name="Manager",
                    model_name=self.model_name,
                )
                agent_id = agent.id
                stored_messages = repos.agent_message_history.get_message_history(
                    project_id,
                    agent_id=agent.id,
                )
                if stored_messages:
                    message_history = repos.agent_message_history.get_model_message_history(
                        project_id,
                        agent_id=agent.id,
                    )
                else:
                    conversation_id = f"situ:{project_id}:{agent.id}"

        tool_deps = SituToolDeps(
            session_id=session_id or "session_unscoped",
            agent_id=agent_id,
            workspace_id=workspace.get("id"),
            project_id=project_id,
            project_dir=self.project_dir,
            repo_path=workspace.get("repo_path"),
        )

        with span(
            "situ.agent.plan",
            workspace=workspace.get("repo_path", ""),
            objective=setup_objective,
        ):
            result = self.dbos_manager_agent.run_sync(
                prompt,
                deps=tool_deps,
                message_history=message_history,
                conversation_id=conversation_id,
            )
        if session_id is not None and repos is not None and project_id is not None:
            repos.agent_message_history.append_project_messages(
                project_id=project_id,
                created_in_session_id=session_id,
                agent_id=agent_id,
                agent_name=MANAGER_AGENT_NAME,
                messages_json=result.new_messages_json(),
                pydantic_run_id=getattr(result, "run_id", None),
                conversation_id=getattr(result, "conversation_id", None),
            )
        return result.output

    def run_session(
        self,
        *,
        workspace: dict[str, Any],
        setup_objective: str,
        setup_research_context: str,
        current_state: dict[str, Any],
        session_id: str,
        max_experiments: int,
        app_root: Path | None = None,
        repos: Repositories | None = None,
        active_task: dict[str, Any] | None = None,
    ) -> AgentPlan:
        prompt = build_session_run_prompt(
            setup_objective=setup_objective,
            setup_research_context=setup_research_context,
            current_state=current_state,
            max_experiments=max_experiments,
            active_task=active_task,
        )
        message_history = None
        conversation_id = None
        project_id = None
        agent = None
        if repos is not None:
            session = repos.sessions.get(session_id)
            project_id = session.project_id if session is not None else None
            if project_id is not None:
                agent = repos.agents.ensure_project_agent(
                    project_id=project_id,
                    created_in_session_id=session_id,
                    kind="scientist",
                    display_name="Scientist",
                    model_name=self.model_name,
                )
        agent_id = agent.id if agent is not None else None
        if agent_id is None and project_id is not None:
            agent_id = f"agent_{project_id}_scientist"
        if agent_id is None:
            agent_id = f"agent_{session_id}_scientist"
        tool_deps = SituToolDeps(
            session_id=session_id,
            agent_id=agent_id,
            workspace_id=workspace.get("id"),
            project_id=project_id,
            project_dir=self.project_dir,
            repo_path=workspace.get("repo_path"),
            app_root=app_root,
        )
        if repos is not None and project_id is not None:
            stored_messages = repos.agent_message_history.get_message_history(
                project_id,
                agent_id=agent_id,
            )
            if stored_messages:
                message_history = repos.agent_message_history.get_model_message_history(
                    project_id,
                    agent_id=agent_id,
                )
            else:
                conversation_id = f"situ:{project_id}:{agent_id}"

        with span(
            "situ.agent.session",
            workspace=workspace.get("repo_path", ""),
            objective=setup_objective,
            session_id=session_id,
        ):
            result = self.dbos_agent.run_sync(
                prompt,
                deps=tool_deps,
                message_history=message_history,
                conversation_id=conversation_id,
            )
        if repos is not None and project_id is not None:
            repos.agent_message_history.append_project_messages(
                project_id=project_id,
                created_in_session_id=session_id,
                agent_id=agent_id,
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
