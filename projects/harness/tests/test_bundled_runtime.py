from __future__ import annotations

from pathlib import Path

import pytest

from situ.harness.core.paths.bundled import (
    BundledRuntime,
    find_bundled_resource,
    resolve_bundled_runtime,
)


def test_find_bundled_resource_returns_path_for_present_file() -> None:
    path = find_bundled_resource("__init__.py")
    assert path is not None
    assert path.name == "__init__.py"
    assert path.exists()


def test_find_bundled_resource_returns_none_for_missing_file() -> None:
    assert find_bundled_resource("definitely-not-bundled-xyz123") is None


def test_resolve_bundled_runtime_returns_installed_when_resource_found(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake = Path("/fake/binary")
    monkeypatch.setattr(
        "situ.harness.core.paths.bundled.find_bundled_resource",
        lambda _name: fake,
    )

    runtime = resolve_bundled_runtime("anything")

    assert runtime is not None
    assert runtime.kind == "installed"
    assert runtime.path == fake
    assert runtime.source_cwd is None


def test_resolve_bundled_runtime_falls_back_to_source_dir(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project_dir = tmp_path / "projects" / "thing"
    project_dir.mkdir(parents=True)
    monkeypatch.setattr(
        "situ.harness.core.paths.bundled.find_bundled_resource",
        lambda _name: None,
    )
    monkeypatch.setenv("SITU_APP_ROOT", str(tmp_path))

    runtime = resolve_bundled_runtime("anything", source_dir="thing")

    assert runtime is not None
    assert runtime.kind == "source"
    assert runtime.path == project_dir
    assert runtime.source_cwd == project_dir


def test_resolve_bundled_runtime_defaults_source_dir_to_name(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project_dir = tmp_path / "projects" / "thing"
    project_dir.mkdir(parents=True)
    monkeypatch.setattr(
        "situ.harness.core.paths.bundled.find_bundled_resource",
        lambda _name: None,
    )
    monkeypatch.setenv("SITU_APP_ROOT", str(tmp_path))

    runtime = resolve_bundled_runtime("thing")

    assert runtime is not None
    assert runtime.kind == "source"
    assert runtime.source_cwd == project_dir


def test_resolve_bundled_runtime_returns_none_when_neither_present(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "situ.harness.core.paths.bundled.find_bundled_resource",
        lambda _name: None,
    )
    monkeypatch.setenv("SITU_APP_ROOT", str(tmp_path))

    assert resolve_bundled_runtime("anything") is None


def test_subprocess_args_for_installed_runtime() -> None:
    runtime = BundledRuntime(
        kind="installed",
        path=Path("/x/bin/tui"),
        source_cwd=None,
    )

    argv, cwd = runtime.subprocess_args()

    assert argv == ["/x/bin/tui"]
    assert cwd is None


def test_subprocess_args_for_source_runtime() -> None:
    project_cwd = Path("/x/projects/tui")
    runtime = BundledRuntime(
        kind="source",
        path=project_cwd,
        source_cwd=project_cwd,
    )

    argv, cwd = runtime.subprocess_args()

    assert argv == ["bun", "run", "dev"]
    assert cwd == project_cwd
