from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path
from typing import Any

from pydantic_ai import Agent
from pydantic_ai.durable_exec.dbos import DBOSAgent

from .agent_skills import (
    build_critic_skill_capabilities,
    build_manager_skill_capabilities,
    build_researcher_skill_capabilities,
    build_scientist_skill_capabilities,
)
from .agents.research.agent import (
    CRITIC_AGENT_NAME,
    RESEARCHER_AGENT_NAME,
    RESEARCH_AGENT_NAME,
    ResearchAgentOutput,
    build_web_search_builtin_tools,
)
from .agents.research.prompt import (
    CRITIC_AGENT_INSTRUCTIONS,
    MANAGER_AGENT_INSTRUCTIONS,
    RESEARCHER_AGENT_INSTRUCTIONS,
    RESEARCH_AGENT_INSTRUCTIONS,
    build_critic_review_prompt,
    build_proposal_round_prompt,
    build_researcher_run_prompt,
    build_session_run_prompt,
)
from .config import DEFAULTS, SituSecrets
from .core.dbos.runtime import configure_dbos, launch_dbos
from .core.observability import configure_observability, span
from .repositories import Repositories
from .tools import (
    build_critic_toolset,
    build_manager_toolset,
    build_researcher_toolset,
    build_research_toolset,
    build_workspace_readonly_toolset,
    build_workspace_toolset,
)
from .tools.common import SituToolDeps


_RUNTIMES: dict[Path, "AgentRuntime"] = {}
AgentPlan = ResearchAgentOutput
MANAGER_AGENT_NAME = "situ-manager-agent"


class AgentRuntime:
    def __init__(self, project_dir: Path, *, database_path: Path | None = None) -> None:
        self.project_dir = project_dir
        self.database_path = database_path or project_dir.parent.parent / "situ.sqlite"
        secrets = SituSecrets()
        secrets_home = project_dir.parent.parent
        secrets.require_local_openai_key(home=secrets_home)
        secrets.apply_local_sdk_environment(home=secrets_home)

        configure_observability(project_dir)
        configure_dbos(project_dir)

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
            capabilities=build_scientist_skill_capabilities(),
            name=RESEARCH_AGENT_NAME,
        )
        self.dbos_agent = DBOSAgent(self.agent, name=RESEARCH_AGENT_NAME)
        self.researcher_agent: Agent[SituToolDeps, AgentPlan] = Agent(
            self.model_name,
            deps_type=SituToolDeps,
            output_type=AgentPlan,
            instructions=RESEARCHER_AGENT_INSTRUCTIONS,
            toolsets=[
                build_researcher_toolset(),
                build_workspace_readonly_toolset(),
            ],
            builtin_tools=build_web_search_builtin_tools(),
            model_settings=DEFAULTS.model_settings(),
            capabilities=build_researcher_skill_capabilities(),
            name=RESEARCHER_AGENT_NAME,
        )
        self.dbos_researcher_agent = DBOSAgent(
            self.researcher_agent,
            name=RESEARCHER_AGENT_NAME,
        )
        self.manager_agent: Agent[SituToolDeps, AgentPlan] = Agent(
            self.model_name,
            deps_type=SituToolDeps,
            output_type=AgentPlan,
            instructions=MANAGER_AGENT_INSTRUCTIONS,
            toolsets=[build_manager_toolset()],
            builtin_tools=build_web_search_builtin_tools(),
            model_settings=DEFAULTS.model_settings(),
            capabilities=build_manager_skill_capabilities(),
            name=MANAGER_AGENT_NAME,
        )
        self.dbos_manager_agent = DBOSAgent(self.manager_agent, name=MANAGER_AGENT_NAME)
        self.critic_agent: Agent[SituToolDeps, AgentPlan] = Agent(
            self.model_name,
            deps_type=SituToolDeps,
            output_type=AgentPlan,
            instructions=CRITIC_AGENT_INSTRUCTIONS,
            toolsets=[
                build_critic_toolset(),
                build_workspace_readonly_toolset(),
            ],
            model_settings=DEFAULTS.model_settings(),
            capabilities=build_critic_skill_capabilities(),
            name=CRITIC_AGENT_NAME,
        )
        self.dbos_critic_agent = DBOSAgent(
            self.critic_agent,
            name=CRITIC_AGENT_NAME,
        )
        launch_dbos()

    def plan_session(
        self,
        *,
        workspace: dict[str, Any],
        setup_objective: str,
        setup_research_context: str,
        assigned_task_ids: Sequence[str] = (),
        session_id: str,
        repos: Repositories | None = None,
    ) -> AgentPlan:
        prompt = build_proposal_round_prompt(
            setup_objective=setup_objective,
            setup_research_context=setup_research_context,
            assigned_task_ids=assigned_task_ids,
        )
        message_history = None
        conversation_id = None
        project_id = None
        agent_id = None
        if repos is not None:
            session = repos.sessions.get(session_id=session_id)
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
                    project_or_session_id=project_id,
                    agent_id=agent.id,
                )
                if stored_messages:
                    message_history = repos.agent_message_history.get_model_message_history(
                        project_or_session_id=project_id,
                        agent_id=agent.id,
                    )
                else:
                    conversation_id = f"situ:{project_id}:{agent.id}"

        tool_deps = SituToolDeps(
            session_id=session_id,
            agent_id=agent_id,
            workspace_id=workspace.get("id"),
            project_id=project_id,
            project_dir=self.project_dir,
            database_path=self.database_path,
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

    def run_research(
        self,
        *,
        workspace: dict[str, Any],
        setup_objective: str,
        setup_research_context: str,
        session_id: str,
        assigned_task_ids: Sequence[str] = (),
        app_root: Path | None = None,
        repos: Repositories | None = None,
    ) -> AgentPlan:
        prompt = build_researcher_run_prompt(
            setup_objective=setup_objective,
            setup_research_context=setup_research_context,
            assigned_task_ids=assigned_task_ids,
        )
        message_history = None
        conversation_id = None
        project_id = None
        agent = None
        if repos is not None:
            session = repos.sessions.get(session_id=session_id)
            project_id = session.project_id if session is not None else None
            if project_id is not None:
                agent = repos.agents.ensure_project_agent(
                    project_id=project_id,
                    created_in_session_id=session_id,
                    kind="researcher",
                    display_name="Researcher",
                    model_name=self.model_name,
                )
        agent_id = agent.id if agent is not None else None
        if agent_id is None and project_id is not None:
            agent_id = f"agent_{project_id}_researcher"
        if agent_id is None:
            agent_id = f"agent_{session_id}_researcher"
        repo_path = workspace.get("repo_path")
        tool_deps = SituToolDeps(
            session_id=session_id,
            agent_id=agent_id,
            workspace_id=workspace.get("id"),
            project_id=project_id,
            project_dir=self.project_dir,
            database_path=self.database_path,
            repo_path=repo_path,
            app_root=app_root,
        )
        if repos is not None and project_id is not None:
            stored_messages = repos.agent_message_history.get_message_history(
                project_or_session_id=project_id,
                agent_id=agent_id,
            )
            if stored_messages:
                message_history = repos.agent_message_history.get_model_message_history(
                    project_or_session_id=project_id,
                    agent_id=agent_id,
                )
            else:
                conversation_id = f"situ:{project_id}:{agent_id}"

        with span(
            "situ.agent.research",
            workspace=repo_path or "",
            objective=setup_objective,
            session_id=session_id,
        ):
            result = self.dbos_researcher_agent.run_sync(
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
                agent_name=RESEARCHER_AGENT_NAME,
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
        session_id: str,
        max_experiments: int,
        assigned_task_ids: Sequence[str] = (),
        app_root: Path | None = None,
        repos: Repositories | None = None,
        repo_path: str | None = None,
        active_experiment_id: str | None = None,
    ) -> AgentPlan:
        prompt = build_session_run_prompt(
            setup_objective=setup_objective,
            setup_research_context=setup_research_context,
            max_experiments=max_experiments,
            assigned_task_ids=assigned_task_ids,
        )
        message_history = None
        conversation_id = None
        project_id = None
        agent = None
        if repos is not None:
            session = repos.sessions.get(session_id=session_id)
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
        execution_repo_path = repo_path or workspace.get("repo_path")
        tool_deps = SituToolDeps(
            session_id=session_id,
            agent_id=agent_id,
            workspace_id=workspace.get("id"),
            project_id=project_id,
            project_dir=self.project_dir,
            database_path=self.database_path,
            repo_path=execution_repo_path,
            app_root=app_root,
            active_experiment_id=active_experiment_id,
        )
        if repos is not None and project_id is not None:
            stored_messages = repos.agent_message_history.get_message_history(
                project_or_session_id=project_id,
                agent_id=agent_id,
            )
            if stored_messages:
                message_history = repos.agent_message_history.get_model_message_history(
                    project_or_session_id=project_id,
                    agent_id=agent_id,
                )
            else:
                conversation_id = f"situ:{project_id}:{agent_id}"

        with span(
            "situ.agent.session",
            workspace=execution_repo_path or "",
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

    def run_review(
        self,
        *,
        workspace: dict[str, Any],
        setup_objective: str,
        setup_research_context: str,
        session_id: str,
        assigned_task_ids: Sequence[str] = (),
        app_root: Path | None = None,
        repos: Repositories | None = None,
    ) -> AgentPlan:
        prompt = build_critic_review_prompt(
            setup_objective=setup_objective,
            setup_research_context=setup_research_context,
            assigned_task_ids=assigned_task_ids,
        )
        message_history = None
        conversation_id = None
        project_id = None
        agent = None
        if repos is not None:
            session = repos.sessions.get(session_id=session_id)
            project_id = session.project_id if session is not None else None
            if project_id is not None:
                agent = repos.agents.ensure_project_agent(
                    project_id=project_id,
                    created_in_session_id=session_id,
                    kind="critic",
                    display_name="Critic",
                    model_name=self.model_name,
                )
        agent_id = agent.id if agent is not None else None
        if agent_id is None and project_id is not None:
            agent_id = f"agent_{project_id}_critic"
        if agent_id is None:
            agent_id = f"agent_{session_id}_critic"
        repo_path = workspace.get("repo_path")
        tool_deps = SituToolDeps(
            session_id=session_id,
            agent_id=agent_id,
            workspace_id=workspace.get("id"),
            project_id=project_id,
            project_dir=self.project_dir,
            database_path=self.database_path,
            repo_path=repo_path,
            app_root=app_root,
        )
        if repos is not None and project_id is not None:
            stored_messages = repos.agent_message_history.get_message_history(
                project_or_session_id=project_id,
                agent_id=agent_id,
            )
            if stored_messages:
                message_history = repos.agent_message_history.get_model_message_history(
                    project_or_session_id=project_id,
                    agent_id=agent_id,
                )
            else:
                conversation_id = f"situ:{project_id}:{agent_id}"

        with span(
            "situ.agent.review",
            workspace=repo_path or "",
            objective=setup_objective,
            session_id=session_id,
        ):
            result = self.dbos_critic_agent.run_sync(
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
                agent_name=CRITIC_AGENT_NAME,
                messages_json=result.new_messages_json(),
                pydantic_run_id=getattr(result, "run_id", None),
                conversation_id=getattr(result, "conversation_id", None),
            )
        return result.output


def get_agent_runtime(
    project_dir: Path,
    *,
    database_path: Path | None = None,
) -> AgentRuntime:
    key = project_dir.resolve()
    runtime = _RUNTIMES.get(key)
    if runtime is None:
        runtime = AgentRuntime(project_dir, database_path=database_path)
        _RUNTIMES[key] = runtime
    return runtime
