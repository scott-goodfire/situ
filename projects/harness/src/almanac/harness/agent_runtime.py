from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.durable_exec.dbos import DBOSAgent
from pydantic_ai.models.test import TestModel

from .dbos_runtime import configure_dbos, launch_dbos
from .observability import configure_observability, span


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

        self.model_name = os.environ.get("ALMANAC_AGENT_MODEL")
        model = self.model_name or TestModel(custom_output_args=self._fallback_plan().model_dump())
        self.agent: Agent[None, AgentPlan] = Agent(
            model,
            output_type=AgentPlan,
            instructions=(
                "You are Almanac's research planner. Produce compact, typed, "
                "evidence-aware planning notes for an autoresearch run. Do not "
                "claim an experiment succeeded unless evidence supports it."
            ),
            name="almanac_research_planner",
        )
        self.dbos_agent = DBOSAgent(self.agent, name="almanac_research_planner")
        launch_dbos()

    def plan_run(self, *, config: dict[str, Any], snapshot: dict[str, Any]) -> AgentPlan:
        prompt = self._prompt(config=config, snapshot=snapshot)
        with span("almanac.agent.plan", workspace=config.get("repo_path", ""), goal=config.get("goal", "")):
            if self.model_name:
                result = self.dbos_agent.run_sync(prompt)
            else:
                test_model = TestModel(custom_output_args=self._fallback_plan(config=config).model_dump())
                with self.agent.override(model=test_model):
                    result = self.dbos_agent.run_sync(prompt)
        return result.output

    def _prompt(self, *, config: dict[str, Any], snapshot: dict[str, Any]) -> str:
        recent_warnings = snapshot.get("warnings", [])[-5:]
        recent_findings = snapshot.get("findings", [])[-5:]
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
