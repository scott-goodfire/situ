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
from situ.harness.api.project_overview.schemas import ProjectOverviewSchema
from situ.harness.records import (
    AgentRecord,
    AnalysisActivityRecord,
    AnalysisRecord,
    ArtifactRecord,
    BaselineActivityRecord,
    BaselineRecord,
    ComputeTargetRecord,
    EventRecord,
    EvaluationActivityRecord,
    EvaluationRecord,
    ExperimentActivityRecord,
    ExperimentRecord,
    HypothesisActivityRecord,
    HypothesisExperimentLinkRecord,
    HypothesisRecord,
    MeasurementRecord,
    ProjectRecord,
    SessionRecord,
    TaskActivityRecord,
    TaskDependencyRecord,
    TaskEntityLinkRecord,
    TaskRecord,
    WorkspaceRecord,
)
from situ.harness.records.base import DbRecord
from situ.harness.tools import (
    build_critic_toolset,
    build_manager_toolset,
    build_scientist_toolset,
)
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
    "baselines": (BaselineRecord, protocol.BaselineRecord),
    "baseline_activities": (
        BaselineActivityRecord,
        protocol.BaselineActivityRecord,
    ),
    "experiments": (ExperimentRecord, protocol.ExperimentRecord),
    "evaluations": (EvaluationRecord, protocol.EvaluationRecord),
    "measurements": (MeasurementRecord, protocol.MeasurementRecord),
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
    "compute_targets": (ComputeTargetRecord, protocol.ComputeTargetRecord),
}

TS_COLLECTION_FIELDS = {
    "workspaces": "workspaces",
    "projects": "projects",
    "sessions": "sessions",
    "hypotheses": "hypotheses",
    "baselines": "baselines",
    "baseline_activities": "baselineActivities",
    "experiments": "experiments",
    "evaluations": "evaluations",
    "measurements": "measurements",
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
    "compute_targets": "computeTargets",
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
    assert set(ProjectOverviewSchema.model_fields) == {
        "summary",
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

    registered_tools = (
        set(build_scientist_toolset().tools)
        | set(build_manager_toolset().tools)
        | set(build_critic_toolset().tools)
    )
    assert registered_tools == set(tool_classes)
    assert "request_project_close" not in build_scientist_toolset().tools
    assert "confirm_project_close" not in build_scientist_toolset().tools
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


RECORDS_ROOT = (
    Path(__file__).resolve().parents[1]
    / "src"
    / "situ"
    / "harness"
    / "records"
)
EVALS_SUITES_ROOT = Path(__file__).resolve().parents[3] / "evals" / "suites" / "agents"
EVALS_WORLDS_ROOT = Path(__file__).resolve().parents[3] / "evals" / "worlds"


def test_records_are_storage_agnostic() -> None:
    """Per policy 0022-durable-records, record modules are storage-agnostic
    Pydantic shapes. They must not import sqlite3, repositories, agents,
    DBOS, or any tool-layer code — those would entangle data with
    storage/runtime concerns."""
    forbidden = ("sqlite3", "..repositories", "..agents", "dbos", "..tools")
    record_files = list(RECORDS_ROOT.glob("*/record.py"))
    assert record_files, "expected record.py files under records/"
    for record_path in record_files:
        text = record_path.read_text()
        for forbidden_token in forbidden:
            assert forbidden_token not in text, (
                f"{record_path.relative_to(RECORDS_ROOT)} imports {forbidden_token!r}; "
                "records are storage-agnostic per policy 0022."
            )


def test_no_internal_env_vars_in_user_config() -> None:
    """Per policy 0015-secrets-only-env, user-facing env vars are limited to
    SITU_ANTHROPIC_KEY and SITU_LOGFIRE_TOKEN. Internal handoff vars must
    not leak into the user-facing doctor enumeration."""
    from situ.harness.cli.commands.doctor.command import (
        INTERNAL_HANDOFF_ENV_VARS,
    )

    assert "SITU_ANTHROPIC_KEY" not in INTERNAL_HANDOFF_ENV_VARS
    assert "SITU_LOGFIRE_TOKEN" not in INTERNAL_HANDOFF_ENV_VARS


def test_tool_folder_completeness() -> None:
    """Per policy 0017-agent-tool-surface, every tool ownership folder has
    the standard `__init__.py + models.py + tool.py` shape."""
    for tool_dir in _tool_directories():
        assert (tool_dir / "__init__.py").is_file(), (
            f"{tool_dir.relative_to(TOOL_ROOT)} missing __init__.py"
        )
        assert (tool_dir / "models.py").is_file(), (
            f"{tool_dir.relative_to(TOOL_ROOT)} missing models.py"
        )
        assert (tool_dir / "tool.py").is_file(), (
            f"{tool_dir.relative_to(TOOL_ROOT)} missing tool.py"
        )


def test_all_tools_subclass_basesitutool() -> None:
    """Per policy 0017-agent-tool-surface, every tool subclasses
    BaseSituTool. Catches tools that bypass the framework's permission
    handling and result-typing contract."""
    for tool_dir in _tool_directories():
        module_name = _tool_module_name(tool_dir)
        module = importlib.import_module(module_name)
        tool_class = _single_tool_class(module)
        assert issubclass(tool_class, BaseSituTool), (
            f"{module_name} does not subclass BaseSituTool"
        )


def test_eval_suite_structure_invariants() -> None:
    """Per policy 0024-eval-worlds-suites, every leaf agent eval suite has
    cases.yaml, eval_group.py, evaluators.py, and __init__.py. A suite is
    a leaf when its directory contains a `cases.yaml` (suite-grouping
    directories like `research_agent/` only hold sub-suites)."""
    leaf_suites = [
        p
        for p in EVALS_SUITES_ROOT.rglob("cases.yaml")
        if p.is_file()
    ]
    assert leaf_suites, "expected at least one cases.yaml under evals/suites/agents/"
    for cases_yaml in leaf_suites:
        suite = cases_yaml.parent
        # cases.yaml, eval_group.py, __init__.py are required for every suite.
        # evaluators.py is optional — suites without custom evaluators reuse
        # framework-level evaluators (e.g. research_session imports from
        # evals.framework.evaluators).
        for required in ("cases.yaml", "eval_group.py", "__init__.py"):
            assert (suite / required).is_file(), (
                f"eval suite {suite.relative_to(EVALS_SUITES_ROOT)} missing {required}"
            )


def test_eval_world_structure_invariants() -> None:
    """Per policy 0024-eval-worlds-suites, every eval world has
    models/, agents/, world/, and __init__.py."""
    world_dirs = [p for p in EVALS_WORLDS_ROOT.iterdir() if p.is_dir() and p.name != "__pycache__"]
    assert world_dirs, "expected world directories under evals/worlds/"
    for world in world_dirs:
        assert (world / "__init__.py").is_file(), f"world {world.name} missing __init__.py"
        for required_dir in ("models", "agents", "world"):
            assert (world / required_dir).is_dir(), (
                f"world {world.name} missing {required_dir}/ directory"
            )


def test_sequential_flag_on_mutation_tools() -> None:
    """Mutation tools (create/update/add/link/claim/run/accept/complete/
    cancel/fail/submit/resolve) should set `sequential = True` so they are
    not parallelized into races. Read tools (get/list/search) leave the
    default."""
    mutating_prefixes = (
        "create_",
        "update_",
        "add_",
        "link_",
        "claim_",
        "run_",
        "accept_",
        "complete_",
        "cancel_",
        "fail_",
        "submit_",
        "resolve_",
    )
    for tool_dir in _tool_directories():
        if not tool_dir.name.startswith(mutating_prefixes):
            continue
        module_name = _tool_module_name(tool_dir)
        module = importlib.import_module(module_name)
        tool_class = _single_tool_class(module)
        assert tool_class.sequential is True, (
            f"{module_name} is a mutation tool but does not set sequential = True"
        )


def test_activity_records_own_separate_kind_enums() -> None:
    """Per policy 0005-primitives and 0022-durable-records, each entity owns
    its own ActivityKind enum. Catches regressions where a shared enum is
    aliased back across entities (e.g., `HypothesisActivityKind = ActivityKind`)."""
    from situ.harness.records import (
        AnalysisActivityKind,
        BaselineActivityKind,
        EvaluationActivityKind,
        ExperimentActivityKind,
        HypothesisActivityKind,
        TaskActivityKind,
    )

    enums = [
        AnalysisActivityKind,
        BaselineActivityKind,
        EvaluationActivityKind,
        ExperimentActivityKind,
        HypothesisActivityKind,
        TaskActivityKind,
    ]
    # Each must be a distinct class object — aliasing produces shared identity.
    distinct_ids = {id(cls) for cls in enums}
    assert len(distinct_ids) == len(enums), (
        "activity-kind enums share identity; each entity must own its own enum class"
    )
    for cls in enums:
        # Sanity: each enum has at least the comment value, which is the
        # load-bearing one for voice-bearing activity comments.
        values = {item.value for item in cls}
        assert "comment" in values, f"{cls.__name__} missing 'comment' kind"
