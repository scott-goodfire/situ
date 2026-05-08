from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path
from typing import Any

from dbos import SetWorkflowTimeout
from pydantic_ai import Agent
from pydantic_ai.durable_exec.dbos import DBOSAgent

from .agent_skills import (
    build_critic_skill_capabilities,
    build_manager_skill_capabilities,
    build_researcher_skill_capabilities,
    build_scientist_skill_capabilities,
)
from .agents.common import build_model_capabilities, keep_last_compaction_history
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
    build_scientist_toolset,
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

        self.model_name = DEFAULTS.agent_model
        self.agent: Agent[SituToolDeps, AgentPlan] = Agent(
            self.model_name,
            deps_type=SituToolDeps,
            output_type=AgentPlan,
            instructions=RESEARCH_AGENT_INSTRUCTIONS,
            toolsets=[
                build_scientist_toolset(),
                build_workspace_toolset(),
            ],
            builtin_tools=build_web_search_builtin_tools(),
            model_settings=DEFAULTS.model_settings(),
            history_processors=[keep_last_compaction_history],
            capabilities=[
                *build_model_capabilities(self.model_name),
                *build_scientist_skill_capabilities(),
            ],
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
            history_processors=[keep_last_compaction_history],
            capabilities=[
                *build_model_capabilities(self.model_name),
                *build_researcher_skill_capabilities(),
            ],
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
            history_processors=[keep_last_compaction_history],
            capabilities=[
                *build_model_capabilities(self.model_name),
                *build_manager_skill_capabilities(),
            ],
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
            builtin_tools=build_web_search_builtin_tools(),
            model_settings=DEFAULTS.model_settings(),
            history_processors=[keep_last_compaction_history],
            capabilities=[
                *build_model_capabilities(self.model_name),
                *build_critic_skill_capabilities(),
            ],
            name=CRITIC_AGENT_NAME,
        )
        self.dbos_critic_agent = DBOSAgent(
            self.critic_agent,
            name=CRITIC_AGENT_NAME,
        )

    @classmethod
    async def create(
        cls,
        project_dir: Path,
        *,
        database_path: Path | None = None,
    ) -> "AgentRuntime":
        secrets = SituSecrets()
        secrets_home = project_dir.parent.parent
        await secrets.require_local_anthropic_key(home=secrets_home)
        await secrets.apply_local_sdk_environment(home=secrets_home)

        await configure_observability(project_dir)
        configure_dbos(project_dir)
        runtime = cls(project_dir, database_path=database_path)
        launch_dbos()
        return runtime

    async def plan_session(
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
            session = await repos.sessions.get(session_id=session_id)
            project_id = session.project_id if session is not None else None
            if project_id is not None:
                agent = await repos.agents.ensure_project_agent(
                    project_id=project_id,
                    created_in_session_id=session_id,
                    kind="manager",
                    display_name="Manager",
                    model_name=self.model_name,
                )
                agent_id = agent.id
                stored_messages = await repos.agent_message_history.get_message_history(
                    project_or_session_id=project_id,
                    agent_id=agent.id,
                    record_cap=None,
                )
                if stored_messages:
                    message_history = await repos.agent_message_history.get_model_message_history(
                        project_or_session_id=project_id,
                        agent_id=agent.id,
                        record_cap=None,
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
            active_task_id=assigned_task_ids[0] if assigned_task_ids else None,
        )

        with span(
            "situ.agent.plan",
            workspace=workspace.get("repo_path", ""),
            objective=setup_objective,
        ):
            result = await self._run_with_workflow_timeout(
                self.dbos_manager_agent.run,
                prompt,
                deps=tool_deps,
                message_history=message_history,
                conversation_id=conversation_id,
            )
        if session_id is not None and repos is not None and project_id is not None:
            await repos.agent_message_history.append_project_messages(
                project_id=project_id,
                created_in_session_id=session_id,
                agent_id=agent_id,
                agent_name=MANAGER_AGENT_NAME,
                messages_json=result.new_messages_json(),
                pydantic_run_id=getattr(result, "run_id", None),
                conversation_id=getattr(result, "conversation_id", None),
            )
        return result.output

    async def run_research(
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
        project_id = None
        if repos is not None:
            session = await repos.sessions.get(session_id=session_id)
            project_id = session.project_id if session is not None else None
        agent_id = await self._task_scoped_agent_id(
            repos=repos,
            project_id=project_id,
            session_id=session_id,
            assigned_task_ids=assigned_task_ids,
            kind="researcher",
            display_name="Researcher",
            model_name=self.model_name,
        ) or f"agent_{session_id}_researcher"
        conversation_id = f"situ:{project_id or session_id}:{agent_id}"
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
            active_task_id=assigned_task_ids[0] if assigned_task_ids else None,
        )
        with span(
            "situ.agent.research",
            workspace=repo_path or "",
            objective=setup_objective,
            session_id=session_id,
        ):
            result = await self._run_with_workflow_timeout(
                self.dbos_researcher_agent.run,
                prompt,
                deps=tool_deps,
                conversation_id=conversation_id,
            )
        if repos is not None and project_id is not None:
            await repos.agent_message_history.append_project_messages(
                project_id=project_id,
                created_in_session_id=session_id,
                agent_id=agent_id,
                agent_name=RESEARCHER_AGENT_NAME,
                messages_json=result.new_messages_json(),
                pydantic_run_id=getattr(result, "run_id", None),
                conversation_id=getattr(result, "conversation_id", None),
            )
        return result.output

    async def run_session(
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
        project_id = None
        if repos is not None:
            session = await repos.sessions.get(session_id=session_id)
            project_id = session.project_id if session is not None else None
        agent_id = await self._task_scoped_agent_id(
            repos=repos,
            project_id=project_id,
            session_id=session_id,
            assigned_task_ids=assigned_task_ids,
            kind="scientist",
            display_name="Scientist",
            model_name=self.model_name,
        ) or f"agent_{session_id}_scientist"
        conversation_id = f"situ:{project_id or session_id}:{agent_id}"
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
            active_task_id=assigned_task_ids[0] if assigned_task_ids else None,
            active_experiment_id=active_experiment_id,
        )
        with span(
            "situ.agent.session",
            workspace=execution_repo_path or "",
            objective=setup_objective,
            session_id=session_id,
        ):
            result = await self._run_with_workflow_timeout(
                self.dbos_agent.run,
                prompt,
                deps=tool_deps,
                conversation_id=conversation_id,
            )
        if repos is not None and project_id is not None:
            await repos.agent_message_history.append_project_messages(
                project_id=project_id,
                created_in_session_id=session_id,
                agent_id=agent_id,
                agent_name=RESEARCH_AGENT_NAME,
                messages_json=result.new_messages_json(),
                pydantic_run_id=getattr(result, "run_id", None),
                conversation_id=getattr(result, "conversation_id", None),
            )
        return result.output

    async def run_review(
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
        project_id = None
        if repos is not None:
            session = await repos.sessions.get(session_id=session_id)
            project_id = session.project_id if session is not None else None
        agent_id = await self._task_scoped_agent_id(
            repos=repos,
            project_id=project_id,
            session_id=session_id,
            assigned_task_ids=assigned_task_ids,
            kind="critic",
            display_name="Critic",
            model_name=self.model_name,
        ) or f"agent_{session_id}_critic"
        conversation_id = f"situ:{project_id or session_id}:{agent_id}"
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
            active_task_id=assigned_task_ids[0] if assigned_task_ids else None,
        )
        with span(
            "situ.agent.review",
            workspace=repo_path or "",
            objective=setup_objective,
            session_id=session_id,
        ):
            result = await self._run_with_workflow_timeout(
                self.dbos_critic_agent.run,
                prompt,
                deps=tool_deps,
                conversation_id=conversation_id,
            )
        if repos is not None and project_id is not None:
            await repos.agent_message_history.append_project_messages(
                project_id=project_id,
                created_in_session_id=session_id,
                agent_id=agent_id,
                agent_name=CRITIC_AGENT_NAME,
                messages_json=result.new_messages_json(),
                pydantic_run_id=getattr(result, "run_id", None),
                conversation_id=getattr(result, "conversation_id", None),
            )
        return result.output

    @staticmethod
    async def _task_scoped_agent_id(
        *,
        repos: Repositories | None,
        project_id: str | None,
        session_id: str,
        assigned_task_ids: Sequence[str],
        kind: str,
        display_name: str,
        model_name: str,
    ) -> str | None:
        if project_id is None:
            return f"agent_{session_id}_{kind}"
        if repos is None:
            return f"agent_{project_id}_{kind}_{assigned_task_ids[0]}" if assigned_task_ids else None
        for task_id in assigned_task_ids:
            task = await repos.tasks.get(task_id=task_id)
            if task is not None and task.assignee_id is not None:
                await repos.agents.update(agent_id=task.assignee_id, model_name=model_name)
                return task.assignee_id
            if task is not None:
                agent = await repos.agents.ensure_task_agent(
                    project_id=project_id,
                    task_id=task.id,
                    created_in_session_id=session_id,
                    kind=kind,
                    display_name=f"{display_name} {task.id}",
                    model_name=model_name,
                )
                return agent.id
        if assigned_task_ids:
            return f"agent_{project_id}_{kind}_{assigned_task_ids[0]}"
        agent = await repos.agents.ensure_task_agent(
            project_id=project_id,
            task_id=f"{session_id}_pass",
            created_in_session_id=session_id,
            kind=kind,
            display_name=f"{display_name} {session_id}",
            model_name=model_name,
        )
        return agent.id

    @staticmethod
    async def _run_with_workflow_timeout(
        run: Any,
        *args: Any,
        **kwargs: Any,
    ) -> Any:
        with SetWorkflowTimeout(DEFAULTS.agent_workflow_timeout_seconds):
            return await run(*args, **kwargs)


async def get_agent_runtime(
    project_dir: Path,
    *,
    database_path: Path | None = None,
) -> AgentRuntime:
    key = project_dir.resolve()
    runtime = _RUNTIMES.get(key)
    if runtime is None:
        runtime = await AgentRuntime.create(project_dir, database_path=database_path)
        _RUNTIMES[key] = runtime
    return runtime
