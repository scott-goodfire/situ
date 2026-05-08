from __future__ import annotations

from pathlib import Path

import pytest

from situ.harness.core.paths.bundled import (
    BundledRuntime,
    PREFER_SOURCE_RUNTIMES_ENV,
    find_bundled_resource,
    prefer_source_runtimes,
    resolve_bundled_runtime,
)


@pytest.mark.asyncio
async def test_find_bundled_resource_returns_path_for_present_file() -> None:
    path = await find_bundled_resource("__init__.py")
    assert path is not None
    assert path.name == "__init__.py"
    assert path.exists()


@pytest.mark.asyncio
async def test_find_bundled_resource_returns_none_for_missing_file() -> None:
    assert await find_bundled_resource("definitely-not-bundled-xyz123") is None


@pytest.mark.asyncio
async def test_resolve_bundled_runtime_returns_installed_when_resource_found(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake = Path("/fake/binary")

    async def fake_find_bundled_resource(_name: str) -> Path | None:
        return fake

    monkeypatch.setattr(
        "situ.harness.core.paths.bundled.find_bundled_resource",
        fake_find_bundled_resource,
    )

    runtime = await resolve_bundled_runtime("anything")

    assert runtime is not None
    assert runtime.kind == "installed"
    assert runtime.path == fake
    assert runtime.source_cwd is None


@pytest.mark.asyncio
async def test_resolve_bundled_runtime_prefers_source_when_configured(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    bundled = Path("/fake/binary")
    source_dir = tmp_path / "projects" / "thing"
    source_dir.mkdir(parents=True)

    async def fake_find_bundled_resource(_name: str) -> Path | None:
        return bundled

    monkeypatch.setattr(
        "situ.harness.core.paths.bundled.find_bundled_resource",
        fake_find_bundled_resource,
    )
    monkeypatch.setenv("SITU_APP_ROOT", str(tmp_path))
    monkeypatch.setenv(PREFER_SOURCE_RUNTIMES_ENV, "1")

    runtime = await resolve_bundled_runtime("anything", source_dir="thing")

    assert runtime is not None
    assert runtime.kind == "source"
    assert runtime.path == source_dir
    assert runtime.source_cwd == source_dir


@pytest.mark.asyncio
async def test_resolve_bundled_runtime_falls_back_to_source_dir(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project_dir = tmp_path / "projects" / "thing"
    project_dir.mkdir(parents=True)

    async def fake_find_bundled_resource(_name: str) -> Path | None:
        return None

    monkeypatch.setattr(
        "situ.harness.core.paths.bundled.find_bundled_resource",
        fake_find_bundled_resource,
    )
    monkeypatch.setenv("SITU_APP_ROOT", str(tmp_path))

    runtime = await resolve_bundled_runtime("anything", source_dir="thing")

    assert runtime is not None
    assert runtime.kind == "source"
    assert runtime.path == project_dir
    assert runtime.source_cwd == project_dir


@pytest.mark.asyncio
async def test_resolve_bundled_runtime_defaults_source_dir_to_name(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project_dir = tmp_path / "projects" / "thing"
    project_dir.mkdir(parents=True)

    async def fake_find_bundled_resource(_name: str) -> Path | None:
        return None

    monkeypatch.setattr(
        "situ.harness.core.paths.bundled.find_bundled_resource",
        fake_find_bundled_resource,
    )
    monkeypatch.setenv("SITU_APP_ROOT", str(tmp_path))

    runtime = await resolve_bundled_runtime("thing")

    assert runtime is not None
    assert runtime.kind == "source"
    assert runtime.source_cwd == project_dir


@pytest.mark.asyncio
async def test_resolve_bundled_runtime_returns_none_when_neither_present(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_find_bundled_resource(_name: str) -> Path | None:
        return None

    monkeypatch.setattr(
        "situ.harness.core.paths.bundled.find_bundled_resource",
        fake_find_bundled_resource,
    )
    monkeypatch.setenv("SITU_APP_ROOT", str(tmp_path))

    assert await resolve_bundled_runtime("anything") is None


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


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("1", True),
        ("true", True),
        ("yes", True),
        ("on", True),
        ("0", False),
        ("false", False),
        ("", False),
    ],
)
def test_prefer_source_runtimes_env(
    value: str,
    expected: bool,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(PREFER_SOURCE_RUNTIMES_ENV, value)

    assert prefer_source_runtimes() is expected


def test_repo_runtime_command_scripts_prefer_source_runtimes() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    for script_name in (
        "app.sh",
        "dev-tui.sh",
        "resume.sh",
        "tui.sh",
        "web.sh",
    ):
        script = repo_root / "commands" / script_name

        assert f"export {PREFER_SOURCE_RUNTIMES_ENV}=1" in script.read_text()
