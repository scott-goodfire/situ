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

    assert store.get_openai_key() == "sk-local-test"
    assert SituSecrets().openai_key_source(home=home) == "local"
    assert SituSecrets().openai_key_value(home=home) == "sk-local-test"
    assert stat.S_IMODE(os.stat(store.path).st_mode) == 0o600


def test_situ_openai_key_env_overrides_local_secret(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    home = tmp_path / "situ-home"
    LocalSecretStore(home=home).set_openai_key("sk-local-test")
    monkeypatch.setenv("SITU_OPENAI_KEY", "sk-env-test")

    secrets = SituSecrets()

    assert secrets.openai_key_source(home=home) == "environment"
    assert secrets.openai_key_value(home=home) == "sk-env-test"


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
    assert saved.openai_key_configured is True
    assert saved.openai_key_source == "local"
    assert present.openai_key_configured is True
    assert present.openai_key_source == "local"
    assert LocalSecretStore(home=tmp_path / "home").get_openai_key() == "sk-rpc-test"
    assert os.environ["OPENAI_API_KEY"] == "sk-rpc-test"
    assert app.repos.events.list_all() == []
    assert notifications == []
