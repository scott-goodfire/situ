from __future__ import annotations

import inspect

from pydantic_ai import FunctionToolset

from .common import AlmanacToolDeps
from .findings import RecordFindingTool
from .run_context import GetRunContextTool

RESEARCH_TOOLSET_INSTRUCTIONS = inspect.cleandoc(
    """
    Use `get_run_context` before making claims about the run. Use
    `record_finding` when an observation should become durable run knowledge.
    Keep findings tied to evidence experiment IDs whenever possible.
    """
)


def build_research_toolset() -> FunctionToolset[AlmanacToolDeps]:
    return FunctionToolset[AlmanacToolDeps](
        id="almanac.research.v1",
        instructions=RESEARCH_TOOLSET_INSTRUCTIONS,
        tools=[
            GetRunContextTool().as_tool(),
            RecordFindingTool().as_tool(),
        ],
    )
