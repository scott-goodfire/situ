from __future__ import annotations

from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.durable_exec.dbos import DBOSAgent
from pydantic_ai.models.test import TestModel

from .config import DEFAULTS, AlmanacSecrets
from .dbos_runtime import configure_dbos, launch_dbos
from .observability import configure_observability, span
from .repositories import Repositories


RESEARCH_PLANNER_AGENT_NAME = "almanac_research_planner"


class AgentPlan(BaseModel):
    summary: str
    proposed_focus: str
    next_components: list[str] = Field(default_factory=list)
    risk_notes: list[str] = Field(default_factory=list)
    should_continue: bool = True


class AgentRuntime:
    def __init__(self, project_dir: Path) -> None:
        configure_observability(project_dir)
        configure_dbos(project_dir)

        secrets = AlmanacSecrets()
        secrets.apply_sdk_environment()

        self.model_name = DEFAULTS.agent_model if secrets.openai_key_value() else None
        model = self.model_name or TestModel(custom_output_args=self._fallback_plan().model_dump())
        self.agent: Agent[None, AgentPlan] = Agent(
            model,
            output_type=AgentPlan,
            instructions=(
                "You are Almanac's research planner. Produce compact, typed, "
                "evidence-aware planning notes for an autoresearch run. Do not "
                "claim an experiment succeeded unless evidence supports it."
            ),
            name=RESEARCH_PLANNER_AGENT_NAME,
        )
        self.dbos_agent = DBOSAgent(self.agent, name=RESEARCH_PLANNER_AGENT_NAME)
        launch_dbos()

    def plan_run(
        self,
        *,
        config: dict[str, Any],
        current_state: dict[str, Any],
        run_id: str | None = None,
        repos: Repositories | None = None,
    ) -> AgentPlan:
        prompt = self._prompt(config=config, current_state=current_state)
        message_history = None
        conversation_id = None
        if run_id is not None and repos is not None:
            stored_messages = repos.agent_message_history.get_message_history(
                run_id,
                agent_name=RESEARCH_PLANNER_AGENT_NAME,
            )
            if stored_messages:
                message_history = repos.agent_message_history.get_model_message_history(
                    run_id,
                    agent_name=RESEARCH_PLANNER_AGENT_NAME,
                )
            else:
                conversation_id = f"almanac:{run_id}:{RESEARCH_PLANNER_AGENT_NAME}"

        with span("almanac.agent.plan", workspace=config.get("repo_path", ""), goal=config.get("goal", "")):
            if self.model_name:
                result = self.dbos_agent.run_sync(
                    prompt,
                    message_history=message_history,
                    conversation_id=conversation_id,
                )
            else:
                test_model = TestModel(custom_output_args=self._fallback_plan(config=config).model_dump())
                with self.agent.override(model=test_model):
                    result = self.dbos_agent.run_sync(
                        prompt,
                        message_history=message_history,
                        conversation_id=conversation_id,
                    )
        if run_id is not None and repos is not None:
            repos.agent_message_history.append_run_messages(
                run_id=run_id,
                agent_name=RESEARCH_PLANNER_AGENT_NAME,
                messages_json=result.new_messages_json(),
                pydantic_run_id=getattr(result, "run_id", None),
                conversation_id=getattr(result, "conversation_id", None),
            )
        return result.output

    def _prompt(self, *, config: dict[str, Any], current_state: dict[str, Any]) -> str:
        recent_warnings = current_state.get("warnings", [])[-5:]
        recent_findings = current_state.get("findings", [])[-5:]
        return "\n".join(
            [
                f"Goal: {config.get('goal', '')}",
                f"Evaluation context: {config.get('evaluation_context', '')}",
                f"Known signals: {', '.join(config.get('known_signals', []))}",
                f"Experiment scope: {config.get('experiment_scope', '')}",
                f"Recent findings: {recent_findings}",
                f"Recent warnings: {recent_warnings}",
                "Return a short plan for the next proposal round.",
            ]
        )

    def _fallback_plan(self, config: dict[str, Any] | None = None) -> AgentPlan:
        known_signals = ", ".join((config or {}).get("known_signals", [])) or "configured signals"
        return AgentPlan(
            summary="Prepared typed agent planning context for the run.",
            proposed_focus="Start with baseline evidence, then compare simple changes and combinations.",
            next_components=["baseline", "A", "B", "C", "A+C"],
            risk_notes=[f"Watch for missing or malformed {known_signals}."],
            should_continue=True,
        )
