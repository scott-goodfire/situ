from __future__ import annotations

import inspect

from pydantic_ai import FunctionToolset

from .activities import ListExperimentActivitiesTool, ListHypothesisActivitiesTool
from .artifacts import CreateArtifactTool, ListArtifactsTool
from .comments import AddExperimentCommentTool, AddHypothesisCommentTool
from .experiments import (
    CreateExperimentTool,
    ListExperimentsTool,
    RunExperimentTool,
    UpdateExperimentTool,
)
from .hypotheses import (
    CreateHypothesisTool,
    ListHypothesesTool,
    UpdateHypothesisTool,
)
from .common import AlmanacToolDeps
from .links import LinkHypothesisExperimentTool
from .objectives import GetObjectiveTool
from .sessions import GetSessionTool

RESEARCH_TOOLSET_INSTRUCTIONS = inspect.cleandoc(
    """
    This toolset is the Almanac research ledger.

    Start with `get_session` when you need the current board: objective,
    hypotheses, experiments, activities, artifacts, and events. Use the
    hypothesis and experiment tools to keep the research structure clear. Use
    `run_experiment` when there is a concrete attempt for the harness to run
    through the configured worker path.

    Use comments for durable research judgment: an interpretation, a risk, a
    useful decision, or a next step. Avoid comments that only narrate routine
    tool use. Results and automated concerns are recorded by the harness.
    """
)


def build_research_toolset() -> FunctionToolset[AlmanacToolDeps]:
    return FunctionToolset[AlmanacToolDeps](
        id="almanac.research.v1",
        instructions=RESEARCH_TOOLSET_INSTRUCTIONS,
        tools=[
            GetSessionTool().as_tool(),
            GetObjectiveTool().as_tool(),
            ListHypothesesTool().as_tool(),
            CreateHypothesisTool().as_tool(),
            UpdateHypothesisTool().as_tool(),
            ListExperimentsTool().as_tool(),
            CreateExperimentTool().as_tool(),
            UpdateExperimentTool().as_tool(),
            RunExperimentTool().as_tool(),
            LinkHypothesisExperimentTool().as_tool(),
            AddHypothesisCommentTool().as_tool(),
            AddExperimentCommentTool().as_tool(),
            ListHypothesisActivitiesTool().as_tool(),
            ListExperimentActivitiesTool().as_tool(),
            CreateArtifactTool().as_tool(),
            ListArtifactsTool().as_tool(),
        ],
    )
