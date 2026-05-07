from __future__ import annotations

import os
import stat
from pathlib import Path

from situ.protocol import SecretsSetOpenAIKeyResult, SecretsStatusResult

from situ.harness.app import HarnessApp
from situ.harness.config import LocalSecretStore, SituSecrets


def test_local_secret_store_saves_openai_key_with_owner_only_permissions(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("SITU_OPENAI_KEY", raising=False)
    home = tmp_path / "situ-home"
    store = LocalSecretStore(home=home)

    store.set_openai_key("  sk-local-test  ")
    store.set_logfire_token("  logfire-local-test  ")

    assert store.get_openai_key() == "sk-local-test"
    assert store.get_logfire_token() == "logfire-local-test"
    assert SituSecrets().openai_key_source(home=home) == "local"
    assert SituSecrets().local_openai_key_value(home=home) == "sk-local-test"
    assert stat.S_IMODE(os.stat(store.path).st_mode) == 0o600


def test_situ_openai_key_env_does_not_override_local_secret(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    home = tmp_path / "situ-home"
    LocalSecretStore(home=home).set_openai_key("sk-local-test")
    monkeypatch.setenv("SITU_OPENAI_KEY", "sk-env-test")

    secrets = SituSecrets()

    assert secrets.openai_key_source(home=home) == "local"
    assert secrets.local_openai_key_value(home=home) == "sk-local-test"
    assert secrets.eval_openai_key_value() == "sk-env-test"


def test_local_runtime_ignores_situ_env_when_local_secret_is_missing(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    home = tmp_path / "situ-home"
    monkeypatch.setenv("SITU_OPENAI_KEY", "sk-env-test")

    secrets = SituSecrets()

    assert secrets.openai_key_source(home=home) == "missing"
    assert secrets.local_openai_key_value(home=home) is None


def test_local_sdk_environment_uses_only_local_secret_store(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    home = tmp_path / "situ-home"
    store = LocalSecretStore(home=home)
    store.set_openai_key("sk-local-test")
    store.set_logfire_token("logfire-local-test")
    monkeypatch.setenv("SITU_OPENAI_KEY", "sk-env-test")
    monkeypatch.setenv("SITU_LOGFIRE_TOKEN", "logfire-env-test")
    monkeypatch.setenv("OPENAI_API_KEY", "provider-openai-test")
    monkeypatch.setenv("LOGFIRE_TOKEN", "provider-logfire-test")

    SituSecrets().apply_local_sdk_environment(home=home)

    assert os.environ["OPENAI_API_KEY"] == "sk-local-test"
    assert os.environ["LOGFIRE_TOKEN"] == "logfire-local-test"


def test_harness_secret_rpc_saves_openai_key_without_ledger_events(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("SITU_OPENAI_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    notifications: list[tuple[str, dict]] = []
    app = HarnessApp(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=lambda method, params: notifications.append((method, params)),
    )

    missing = SecretsStatusResult.model_validate(app.secrets_status({}))
    saved = SecretsSetOpenAIKeyResult.model_validate(
        app.secrets_set_openai_key({"openai_key": "sk-rpc-test"})
    )
    present = SecretsStatusResult.model_validate(app.secrets_status({}))

    assert missing.openai_key_configured is False
    assert missing.openai_key_source == "missing"
    assert missing.logfire_token_configured is False
    assert missing.logfire_token_source == "missing"
    assert saved.openai_key_configured is True
    assert saved.openai_key_source == "local"
    assert saved.logfire_token_configured is False
    assert saved.logfire_token_source == "missing"
    assert present.openai_key_configured is True
    assert present.openai_key_source == "local"
    assert present.logfire_token_configured is False
    assert present.logfire_token_source == "missing"
    assert (
        LocalSecretStore(home=tmp_path / "home").get_openai_key()
        == "sk-rpc-test"
    )
    assert os.environ["OPENAI_API_KEY"] == "sk-rpc-test"
    assert app.repos.events.list_all() == []
    assert notifications == []


def test_harness_secret_rpc_saves_optional_logfire_token(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("SITU_OPENAI_KEY", raising=False)
    monkeypatch.delenv("SITU_LOGFIRE_TOKEN", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("LOGFIRE_TOKEN", raising=False)
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    app = HarnessApp(
        workspace,
        app_root=Path.cwd(),
        project_home=tmp_path / "home",
        notify=lambda _method, _params: None,
    )

    saved = SecretsSetOpenAIKeyResult.model_validate(
        app.secrets_set_openai_key(
            {
                "openai_key": "sk-rpc-test",
                "logfire_token": "logfire-rpc-test",
            }
        )
    )
    present = SecretsStatusResult.model_validate(app.secrets_status({}))
    store = LocalSecretStore(home=tmp_path / "home")

    assert saved.openai_key_source == "local"
    assert saved.logfire_token_configured is True
    assert saved.logfire_token_source == "local"
    assert present.logfire_token_configured is True
    assert present.logfire_token_source == "local"
    assert store.get_openai_key() == "sk-rpc-test"
    assert store.get_logfire_token() == "logfire-rpc-test"
    assert os.environ["OPENAI_API_KEY"] == "sk-rpc-test"
    assert os.environ["LOGFIRE_TOKEN"] == "logfire-rpc-test"


def test_eval_environment_requires_situ_openai_key_and_logfire_token(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("SITU_OPENAI_KEY", raising=False)
    monkeypatch.delenv("SITU_LOGFIRE_TOKEN", raising=False)
    LocalSecretStore(home=tmp_path / "situ-home").set_openai_key("sk-local-test")

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
        assert "SITU_OPENAI_KEY" in str(error)
    else:
        raise AssertionError("Expected missing eval OpenAI key to fail.")

    monkeypatch.setenv("SITU_OPENAI_KEY", "openai-env-test")
    secrets = SituSecrets()
    secrets.require_eval_environment()

    assert os.environ["LOGFIRE_TOKEN"] == "logfire-env-test"
    assert os.environ["OPENAI_API_KEY"] == "openai-env-test"
