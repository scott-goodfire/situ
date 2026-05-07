from __future__ import annotations

import inspect

from pydantic_ai import Agent
from pydantic_ai import FunctionToolset

from situ.harness.config import DEFAULTS
from situ.harness.core.workers import WorkerManager
from situ.harness.tools import build_manager_toolset, build_research_toolset
from situ.harness.tools.common import SituToolDeps
from situ.protocol import ExperimentRunParams, ExperimentRunResult
from evals.harness.capture import ToolCallCaptureCapability
from evals.harness.llms import eval_model_name
from evals.worlds.research_session.models import (
    ResearchToolEvalInput,
    ResearchToolEvalOutput,
)
from evals.worlds.research_session.world import (
    SCIENTIST_AGENT_ID,
    SESSION_ID,
    ResearchSessionWorld,
)

RESEARCH_TOOL_AGENT_NAME = "situ-research-tool-eval-agent"
RESEARCH_TOOL_AGENT_INSTRUCTIONS = inspect.cleandoc(
    """
    You are helping test Situ's research tool surface.

    Do the requested action directly with the available tools. Use the project-state tools
    for all session, objective, hypothesis, baseline, experiment, evaluation,
    measurement, activity, and artifact facts. Prefer focused `list_*` tools
    when the prompt asks you to read one type of record. Keep the final answer
    short, grounded, and explicit about the action you completed.
    """
)


def run_research_tool_agent(args: ResearchToolEvalInput) -> ResearchToolEvalOutput:
    world = ResearchSessionWorld(seed=args.seed)
    capture = ToolCallCaptureCapability()
    try:
        deps = SituToolDeps(
            session_id=SESSION_ID,
            agent_id=SCIENTIST_AGENT_ID if args.seed != "projectless" else None,
            repos=world.repos,
            repo_path=str(world.repo_path),
            worker_manager=_EvalWorkerManager(),
            emit_event=world.emit_event,
        )
        agent = _build_agent(capture, toolset=args.toolset)
        result = agent.run_sync(args.prompt, deps=deps)
        return ResearchToolEvalOutput(
            content=str(result.output),
            captured_tool_calls=list(capture.tool_calls),
            events=list(world.events),
            project_board=world.project_board(),
            signals={
                "tool_calls": len(capture.tool_calls),
                "events": len(world.events),
            },
        )
    finally:
        world.teardown()


def _build_agent(
    capture: ToolCallCaptureCapability,
    *,
    toolset: str,
) -> Agent[SituToolDeps, str]:
    return Agent[SituToolDeps, str](
        eval_model_name(),
        name=RESEARCH_TOOL_AGENT_NAME,
        deps_type=SituToolDeps,
        output_type=str,
        instructions=RESEARCH_TOOL_AGENT_INSTRUCTIONS,
        toolsets=[_build_toolset(toolset)],
        model_settings=DEFAULTS.model_settings(),
        capabilities=[capture],
    )


def _build_toolset(toolset: str) -> FunctionToolset[SituToolDeps]:
    if toolset == "manager":
        return build_manager_toolset()
    return build_research_toolset()


class _EvalWorkerManager(WorkerManager):
    def __init__(self) -> None:
        pass

    def run_experiment(
        self,
        params: ExperimentRunParams,
        on_progress,
    ) -> ExperimentRunResult:
        on_progress(
            {
                "params": {
                    "session_id": params.session_id,
                    "experiment_id": params.experiment_id,
                    "message": "eval worker progress",
                }
            }
        )
        return ExperimentRunResult(
            experiment_id=params.experiment_id,
            status="completed",
            summary=f"{params.title} produced score 0.720.",
            signals=[{"key": "score", "value": 0.72}],
            raw={"shape": "standard", "components": params.components},
        )
