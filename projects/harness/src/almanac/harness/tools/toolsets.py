from __future__ import annotations

import inspect
from typing import cast

from pydantic_ai import FunctionToolset
from pydantic_ai_backends import create_console_toolset

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
    This toolset is the Almanac research ledger.

    Start with `get_session` when you need the current board: objective,
    hypotheses, experiments, activities, artifacts, and events. Use the
    hypothesis and experiment tools to keep the research structure clear.

    Use comments for durable research judgment: an interpretation, a risk, a
    useful decision, raw command evidence, or a next step. Avoid comments that
    only narrate routine tool use.

    To inspect files or run project-native commands, use the workspace console
    tools. Keep Almanac responsible for the ledger and the workspace tools
    responsible for bash/filesystem interaction.
    """
)

WORKSPACE_EXECUTE_DESCRIPTION = inspect.cleandoc(
    """
    Execute a project-native shell command in the workspace.

    Use this for ordinary project commands: tests, evals, benchmarks, scripts,
    package-manager commands, and quick environment probes. Treat the returned
    output as plaintext evidence. Do not deterministically parse metrics from
    it inside the tool layer; when the output matters, record the raw text or a
    concise LLM interpretation in an Almanac experiment comment.
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


def build_workspace_toolset() -> FunctionToolset[AlmanacToolDeps]:
    return cast(
        FunctionToolset[AlmanacToolDeps],
        create_console_toolset(
            id="almanac.workspace.v1",
            include_execute=True,
            require_write_approval=False,
            require_execute_approval=False,
            default_ignore_hidden=True,
            descriptions={
                "execute": WORKSPACE_EXECUTE_DESCRIPTION,
            },
        ),
    )
