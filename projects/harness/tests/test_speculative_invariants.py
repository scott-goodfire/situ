"""Speculative-tier invariants flagged by the policy audit.

These guard conventions that are real but less load-bearing than the
core invariants. They live in their own file so we can drop or relax
them without disturbing the higher-leverage suites if any prove
brittle.

Two tests from the audit are deliberately not implemented here:

- `test_evals_require_credentials` — needs subprocess + env mutation,
  fragile in CI; the eval surface already fails loudly when credentials
  are missing.
- `test_experiment_comparability_records_command` — judgment-call shape
  per the audit; better as a code review than an automated assertion.
"""
from __future__ import annotations

import ast
import inspect
import pickle
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
API_ROOT = (
    REPO_ROOT / "projects" / "harness" / "src" / "situ" / "harness" / "api"
)
EVALS_WORLDS_ROOT = REPO_ROOT / "evals" / "worlds"


def test_dbos_agent_deps_are_serializable() -> None:
    """`SituToolDeps` is the agent dep object passed through DBOS-wrapped
    workflows. DBOS serializes step boundaries; non-serializable fields
    on the dep model would break checkpointing. This test verifies the
    declared model has no fields that obviously require live runtime
    objects (db connections, open files, async tasks). It does not
    instantiate or pickle live deps — those carry runtime handles by
    design and are excluded from serialization via Pydantic's
    `exclude=True` markers."""
    from situ.harness.tools.common import SituToolDeps

    fields = SituToolDeps.model_fields
    # Every field that holds a live runtime handle must be excluded from
    # serialization so DBOS workflow checkpointing succeeds. The set of
    # such fields is small; an addition without `exclude=True` would
    # silently break durable execution.
    runtime_handle_fields = ("repos", "emit_event")
    for name in runtime_handle_fields:
        assert name in fields, f"SituToolDeps missing expected field {name!r}"
        assert fields[name].exclude is True, (
            f"SituToolDeps.{name} carries a runtime handle and must be "
            f"declared with `exclude=True` so DBOS can serialize the deps."
        )


def test_api_services_use_keyword_only_public_methods() -> None:
    """Per policy 0012-module-organization, public service methods take
    keyword-only arguments so call sites stay self-describing in traces.
    This test scans `api/<surface>/service.py` files for public async
    methods on the service class and asserts each accepts only
    keyword-only application parameters."""
    service_files = sorted(API_ROOT.glob("*/service.py"))
    if not service_files:
        pytest.skip("no api/*/service.py files found")
    violations: list[str] = []
    for service_path in service_files:
        tree = ast.parse(service_path.read_text())
        for node in ast.walk(tree):
            if not isinstance(node, ast.ClassDef):
                continue
            for item in node.body:
                if not isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                if item.name.startswith("_"):
                    continue
                # Skip @staticmethod / @classmethod helpers — those are
                # explicitly utility-shaped and don't represent the
                # service's call surface.
                decorator_names = {
                    d.id for d in item.decorator_list if isinstance(d, ast.Name)
                }
                if decorator_names & {"staticmethod", "classmethod"}:
                    continue
                positional = [
                    a.arg
                    for a in item.args.args
                    if a.arg != "self"
                ]
                if positional:
                    violations.append(
                        f"{service_path.relative_to(REPO_ROOT)}::"
                        f"{node.name}.{item.name} accepts positional args "
                        f"{positional}; per policy 0012, public service "
                        f"methods are keyword-only."
                    )
    assert not violations, "\n".join(violations)


def test_eval_worlds_do_not_hardcode_workspace_log_paths() -> None:
    """Per policy 0026-experiment-workspaces, scratch logs and run logs
    live under the runtime artifact directory (`SITU_RUN_LOG`,
    `SITU_ARTIFACT_DIR`), not as hardcoded files in the researched repo.
    Catches eval worlds that accidentally write `run.log`,
    `experiment.log`, or similar into the workspace path."""
    suspicious_pattern = re.compile(
        r'["\'](?:run|experiment|eval|train)\.log["\']'
    )
    violations: list[str] = []
    for world_py in EVALS_WORLDS_ROOT.rglob("world/world.py"):
        text = world_py.read_text()
        for match in suspicious_pattern.finditer(text):
            line_number = text[: match.start()].count("\n") + 1
            violations.append(
                f"{world_py.relative_to(REPO_ROOT)}:{line_number}: {match.group(0)}"
            )
    assert not violations, (
        "eval worlds reference hardcoded log filenames; use SITU_RUN_LOG "
        "or SITU_ARTIFACT_DIR per policy 0026:\n  " + "\n  ".join(violations)
    )
