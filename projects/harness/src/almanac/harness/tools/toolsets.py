from __future__ import annotations

import inspect

from pydantic_ai import FunctionToolset

from .activities import ListExperimentActivitiesTool, ListHypothesisActivitiesTool
from .artifacts import CreateArtifactTool, ListArtifactsTool
from .comments import AddExperimentCommentTool, AddHypothesisCommentTool
from .experiments import (
    CreateExperimentTool,
    ListExperimentsTool,
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
    Use `get_session` to inspect the current research state before making claims.
    Use CRUD-shaped tools to create or update hypotheses and experiments. Use
    `add_hypothesis_comment` and `add_experiment_comment` for durable
    observations that should persist across sessions.

    Comments should be meaningful research notes, not routine narration.
    Results and automated concerns are usually harness-owned activity.
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
            LinkHypothesisExperimentTool().as_tool(),
            AddHypothesisCommentTool().as_tool(),
            AddExperimentCommentTool().as_tool(),
            ListHypothesisActivitiesTool().as_tool(),
            ListExperimentActivitiesTool().as_tool(),
            CreateArtifactTool().as_tool(),
            ListArtifactsTool().as_tool(),
        ],
    )
