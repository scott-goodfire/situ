from __future__ import annotations

import importlib
import inspect
import re
from pathlib import Path
from typing import get_args

import situ.protocol as protocol
from situ.protocol.control import CollectionName, CollectionsBootstrapResult

from situ.harness.api.collections.publisher import COLLECTION_ROUTES
from situ.harness.api.collections.schemas import CollectionsBootstrapSchema
from situ.harness.api.current_state.schemas import CurrentStateSchema
from situ.harness.api.sessions.schemas import SessionGraphSchema
from situ.harness.records import (
    AgentRecord,
    AnalysisActivityRecord,
    AnalysisRecord,
    ArtifactRecord,
    EventRecord,
    EvaluationActivityRecord,
    EvaluationRecord,
    ExperimentActivityRecord,
    ExperimentRecord,
    HypothesisActivityRecord,
    HypothesisExperimentLinkRecord,
    HypothesisRecord,
    ProjectRecord,
    SessionRecord,
    TaskActivityRecord,
    TaskDependencyRecord,
    TaskEntityLinkRecord,
    TaskRecord,
    WorkspaceRecord,
)
from situ.harness.records.base import DbRecord
from situ.harness.tools import build_manager_toolset, build_research_toolset
from situ.harness.tools.common import BaseSituTool, SituToolReturn

REPO_ROOT = Path(__file__).resolve().parents[3]
TOOL_ROOT = REPO_ROOT / "projects" / "harness" / "src" / "situ" / "harness" / "tools"
TS_COLLECTIONS_PATH = (
    REPO_ROOT / "shared" / "typescript" / "collections" / "src" / "index.ts"
)

PUBLISHABLE_RECORDS: dict[str, tuple[type[DbRecord], type]] = {
    "workspaces": (WorkspaceRecord, protocol.WorkspaceRecord),
    "projects": (ProjectRecord, protocol.ProjectRecord),
    "sessions": (SessionRecord, protocol.SessionRecord),
    "hypotheses": (HypothesisRecord, protocol.HypothesisRecord),
    "experiments": (ExperimentRecord, protocol.ExperimentRecord),
    "evaluations": (EvaluationRecord, protocol.EvaluationRecord),
    "analyses": (AnalysisRecord, protocol.AnalysisRecord),
    "hypothesis_experiment_links": (
        HypothesisExperimentLinkRecord,
        protocol.HypothesisExperimentLinkRecord,
    ),
    "agents": (AgentRecord, protocol.AgentRecord),
    "tasks": (TaskRecord, protocol.TaskRecord),
    "task_dependencies": (TaskDependencyRecord, protocol.TaskDependencyRecord),
    "task_entity_links": (TaskEntityLinkRecord, protocol.TaskEntityLinkRecord),
    "task_activities": (TaskActivityRecord, protocol.TaskActivityRecord),
    "analysis_activities": (
        AnalysisActivityRecord,
        protocol.AnalysisActivityRecord,
    ),
    "hypothesis_activities": (
        HypothesisActivityRecord,
        protocol.HypothesisActivityRecord,
    ),
    "experiment_activities": (
        ExperimentActivityRecord,
        protocol.ExperimentActivityRecord,
    ),
    "evaluation_activities": (
        EvaluationActivityRecord,
        protocol.EvaluationActivityRecord,
    ),
    "artifacts": (ArtifactRecord, protocol.ArtifactRecord),
    "events": (EventRecord, protocol.EventRecord),
}

TS_COLLECTION_FIELDS = {
    "workspaces": "workspaces",
    "projects": "projects",
    "sessions": "sessions",
    "hypotheses": "hypotheses",
    "experiments": "experiments",
    "evaluations": "evaluations",
    "analyses": "analyses",
    "hypothesis_experiment_links": "hypothesisExperimentLinks",
    "agents": "agents",
    "tasks": "tasks",
    "task_dependencies": "taskDependencies",
    "task_entity_links": "taskEntityLinks",
    "task_activities": "taskActivities",
    "analysis_activities": "analysisActivities",
    "hypothesis_activities": "hypothesisActivities",
    "experiment_activities": "experimentActivities",
    "evaluation_activities": "evaluationActivities",
    "artifacts": "artifacts",
    "events": "events",
}

MUTATING_TOOL_PREFIXES = ("create_", "update_", "add_", "link_", "claim_", "run_")


def test_publishable_records_and_collection_surfaces_stay_aligned() -> None:
    collection_names = set(PUBLISHABLE_RECORDS)

    assert set(COLLECTION_ROUTES) == {
        record_type for record_type, _protocol_type in PUBLISHABLE_RECORDS.values()
    }
    assert {route.collection for route in COLLECTION_ROUTES.values()} == collection_names
    assert set(get_args(CollectionName)) == collection_names
    assert set(CollectionsBootstrapSchema.model_fields) - {"cursor"} == collection_names
    assert set(CollectionsBootstrapResult.model_fields) - {"cursor"} == collection_names

    assert set(CurrentStateSchema.model_fields) == {
        "workspace",
        *(collection_names - {"workspaces"}),
    }
    assert set(SessionGraphSchema.model_fields) == {
        "workspace",
        "project",
        "session",
        *(
            collection_names
            - {"workspaces", "projects", "sessions"}
        ),
    }

    assert _typescript_collection_fields() == set(TS_COLLECTION_FIELDS.values())
    assert _typescript_upsert_branches() == collection_names

    for collection, (harness_record, protocol_record) in PUBLISHABLE_RECORDS.items():
        assert harness_record.model_json_schema() == protocol_record.model_json_schema(), (
            collection
        )


def test_situ_tool_folders_match_toolset_registration() -> None:
    tool_classes = {}

    for tool_dir in _tool_directories():
        assert (tool_dir / "__init__.py").is_file()
        assert (tool_dir / "models.py").is_file()
        assert (tool_dir / "tool.py").is_file()

        module_name = _tool_module_name(tool_dir)
        module = importlib.import_module(module_name)
        tool_class = _single_tool_class(module)
        result_type = tool_class.result_type

        assert tool_class.name == tool_dir.name
        assert issubclass(result_type, SituToolReturn)
        assert tool_class.__name__ in module.__all__
        assert result_type.__name__ in module.__all__

        parent_module = importlib.import_module(module_name.rsplit(".", 1)[0])
        assert tool_class.__name__ in parent_module.__all__
        assert result_type.__name__ in parent_module.__all__

        if tool_class.name.startswith(MUTATING_TOOL_PREFIXES):
            assert tool_class.sequential is True

        tool_classes[tool_class.name] = tool_class

    registered_tools = set(build_research_toolset().tools) | set(
        build_manager_toolset().tools
    )
    assert registered_tools == set(tool_classes)
    assert "request_project_close" not in build_research_toolset().tools
    assert "confirm_project_close" not in build_research_toolset().tools
    assert "request_project_close" in build_manager_toolset().tools
    assert "confirm_project_close" in build_manager_toolset().tools


def _typescript_collection_fields() -> set[str]:
    source = TS_COLLECTIONS_PATH.read_text()
    match = re.search(r"export type SituCollections = \{(?P<body>.*?)\};", source, re.S)
    assert match is not None
    return set(
        re.findall(
            r"^\s+([A-Za-z][A-Za-z0-9]*): Collection<",
            match.group("body"),
            re.M,
        )
    )


def _typescript_upsert_branches() -> set[str]:
    source = TS_COLLECTIONS_PATH.read_text()
    return set(re.findall(r'upsert\.collection === "([^"]+)"', source))


def _tool_directories() -> list[Path]:
    return sorted(
        path
        for path in TOOL_ROOT.glob("*/*")
        if path.is_dir() and (path / "tool.py").is_file()
    )


def _tool_module_name(tool_dir: Path) -> str:
    return "situ.harness.tools." + ".".join(tool_dir.relative_to(TOOL_ROOT).parts)


def _single_tool_class(module) -> type[BaseSituTool]:
    tool_classes = [
        tool_class
        for _name, tool_class in inspect.getmembers(module, inspect.isclass)
        if issubclass(tool_class, BaseSituTool)
        and tool_class is not BaseSituTool
        and tool_class.__module__.startswith(module.__name__)
    ]
    assert len(tool_classes) == 1
    return tool_classes[0]
