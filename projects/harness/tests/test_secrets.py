from __future__ import annotations

import os
import stat
from pathlib import Path

import pytest
from situ.protocol import SecretsSetAnthropicKeyResult, SecretsStatusResult

from situ.harness.app import HarnessApp
from situ.harness.config import LocalSecretStore, SituSecrets


def test_local_secret_store_saves_anthropic_key_with_owner_only_permissions(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("SITU_ANTHROPIC_KEY", raising=False)
    home = tmp_path / "situ-home"
    store = LocalSecretStore(home=home)

    store.set_anthropic_key("  sk-local-test  ")
    store.set_logfire_token("  logfire-local-test  ")

    assert store.get_anthropic_key() == "sk-local-test"
    assert store.get_logfire_token() == "logfire-local-test"
    assert SituSecrets().anthropic_key_source(home=home) == "local"
    assert SituSecrets().local_anthropic_key_value(home=home) == "sk-local-test"
    assert stat.S_IMODE(os.stat(store.path).st_mode) == 0o600

    assert store.unset_logfire_token() is True
    assert store.get_anthropic_key() == "sk-local-test"
    assert store.get_logfire_token() is None
    assert store.unset_logfire_token() is False

    assert store.clear() is True
    assert store.get_anthropic_key() is None
    assert store.path.exists() is False
    assert store.clear() is False


def test_situ_anthropic_key_env_does_not_override_local_secret(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    home = tmp_path / "situ-home"
    LocalSecretStore(home=home).set_anthropic_key("sk-local-test")
    monkeypatch.setenv("SITU_ANTHROPIC_KEY", "sk-env-test")

    secrets = SituSecrets()

    assert secrets.anthropic_key_source(home=home) == "local"
    assert secrets.local_anthropic_key_value(home=home) == "sk-local-test"
    assert secrets.eval_anthropic_key_value() == "sk-env-test"


def test_local_runtime_ignores_situ_env_when_local_secret_is_missing(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    home = tmp_path / "situ-home"
    monkeypatch.setenv("SITU_ANTHROPIC_KEY", "sk-env-test")

    secrets = SituSecrets()

    assert secrets.anthropic_key_source(home=home) == "missing"
    assert secrets.local_anthropic_key_value(home=home) is None


def test_local_sdk_environment_uses_only_local_secret_store(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    home = tmp_path / "situ-home"
    store = LocalSecretStore(home=home)
    store.set_anthropic_key("sk-local-test")
    store.set_logfire_token("logfire-local-test")
    monkeypatch.setenv("SITU_ANTHROPIC_KEY", "sk-env-test")
    monkeypatch.setenv("SITU_LOGFIRE_TOKEN", "logfire-env-test")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "provider-anthropic-test")
    monkeypatch.setenv("LOGFIRE_TOKEN", "provider-logfire-test")

    SituSecrets().apply_local_sdk_environment(home=home)

    assert os.environ["ANTHROPIC_API_KEY"] == "sk-local-test"
    assert os.environ["LOGFIRE_TOKEN"] == "logfire-local-test"


@pytest.mark.asyncio
async def test_harness_secret_rpc_saves_anthropic_key_without_ledger_events(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("SITU_ANTHROPIC_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    notifications: list[tuple[str, dict]] = []
    app = HarnessApp(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=lambda method, params: notifications.append((method, params)),
    )

    missing = SecretsStatusResult.model_validate(
        await app.handle_async("secrets.status", {})
    )
    saved = SecretsSetAnthropicKeyResult.model_validate(
        await app.handle_async(
            "secrets.set_anthropic_key",
            {"anthropic_key": "sk-rpc-test"},
        )
    )
    present = SecretsStatusResult.model_validate(
        await app.handle_async("secrets.status", {})
    )

    assert missing.anthropic_key_configured is False
    assert missing.anthropic_key_source == "missing"
    assert missing.logfire_token_configured is False
    assert missing.logfire_token_source == "missing"
    assert saved.anthropic_key_configured is True
    assert saved.anthropic_key_source == "local"
    assert saved.logfire_token_configured is False
    assert saved.logfire_token_source == "missing"
    assert present.anthropic_key_configured is True
    assert present.anthropic_key_source == "local"
    assert present.logfire_token_configured is False
    assert present.logfire_token_source == "missing"
    assert (
        LocalSecretStore(home=tmp_path / "home").get_anthropic_key()
        == "sk-rpc-test"
    )
    assert os.environ["ANTHROPIC_API_KEY"] == "sk-rpc-test"
    assert await app.repos.events.list_all() == []
    assert notifications == []


@pytest.mark.asyncio
async def test_harness_secret_rpc_saves_optional_logfire_token(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("SITU_ANTHROPIC_KEY", raising=False)
    monkeypatch.delenv("SITU_LOGFIRE_TOKEN", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("LOGFIRE_TOKEN", raising=False)
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    app = HarnessApp(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=lambda _method, _params: None,
    )

    saved = SecretsSetAnthropicKeyResult.model_validate(
        await app.handle_async(
            "secrets.set_anthropic_key",
            {
                "anthropic_key": "sk-rpc-test",
                "logfire_token": "logfire-rpc-test",
            },
        )
    )
    present = SecretsStatusResult.model_validate(
        await app.handle_async("secrets.status", {})
    )
    store = LocalSecretStore(home=tmp_path / "home")

    assert saved.anthropic_key_source == "local"
    assert saved.logfire_token_configured is True
    assert saved.logfire_token_source == "local"
    assert present.logfire_token_configured is True
    assert present.logfire_token_source == "local"
    assert store.get_anthropic_key() == "sk-rpc-test"
    assert store.get_logfire_token() == "logfire-rpc-test"
    assert os.environ["ANTHROPIC_API_KEY"] == "sk-rpc-test"
    assert os.environ["LOGFIRE_TOKEN"] == "logfire-rpc-test"


def test_eval_environment_requires_situ_anthropic_key_and_logfire_token(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("SITU_ANTHROPIC_KEY", raising=False)
    monkeypatch.delenv("SITU_LOGFIRE_TOKEN", raising=False)
    LocalSecretStore(home=tmp_path / "situ-home").set_anthropic_key("sk-local-test")

    secrets = SituSecrets()

    try:
        secrets.require_eval_environment()
    except RuntimeError as error:
        assert "SITU_LOGFIRE_TOKEN" in str(error)
    else:
        raise AssertionError("Expected missing eval Logfire token to fail.")

    monkeypatch.setenv("SITU_LOGFIRE_TOKEN", "logfire-env-test")
    secrets = SituSecrets()
    try:
        secrets.require_eval_environment()
    except RuntimeError as error:
        assert "SITU_ANTHROPIC_KEY" in str(error)
    else:
        raise AssertionError("Expected missing eval Anthropic key to fail.")

    monkeypatch.setenv("SITU_ANTHROPIC_KEY", "anthropic-env-test")
    secrets = SituSecrets()
    secrets.require_eval_environment()

    assert os.environ["LOGFIRE_TOKEN"] == "logfire-env-test"
    assert os.environ["ANTHROPIC_API_KEY"] == "anthropic-env-test"
