from __future__ import annotations

import inspect

from pydantic_ai import FunctionToolset

from .activities import RecordExperimentActivityTool, RecordHypothesisActivityTool
from .agent_context import GetAgentContextTool
from .common import AlmanacToolDeps

RESEARCH_TOOLSET_INSTRUCTIONS = inspect.cleandoc(
    """
    Use `get_agent_context` before making claims about the session. Record durable
    observations as hypothesis or experiment activities. Prefer concise activity
    bodies with structured payloads for metrics, artifacts, or raw details.
    """
)


def build_research_toolset() -> FunctionToolset[AlmanacToolDeps]:
    return FunctionToolset[AlmanacToolDeps](
        id="almanac.research.v1",
        instructions=RESEARCH_TOOLSET_INSTRUCTIONS,
        tools=[
            GetAgentContextTool().as_tool(),
            RecordHypothesisActivityTool().as_tool(),
            RecordExperimentActivityTool().as_tool(),
        ],
    )
