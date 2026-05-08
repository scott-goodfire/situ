from __future__ import annotations

import json
from pathlib import Path

import pytest

from situ.harness.cli import commands as cli
from situ.harness.config import LocalSecretStore


@pytest.fixture(autouse=True)
def isolated_home(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("HOME", str(home))
    return home


def test_secrets_status_uses_only_local_store(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv("SITU_ANTHROPIC_KEY", "sk-env-test")
    monkeypatch.setenv("SITU_LOGFIRE_TOKEN", "logfire-env-test")

    code = cli.main(["secrets", "status", "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert code == 0
    assert captured.err == ""
    assert payload["anthropic"] == {"configured": False, "source": "missing"}
    assert payload["logfire"] == {"configured": False, "source": "missing"}
    assert "sk-env-test" not in captured.out
    assert "logfire-env-test" not in captured.out


def test_secrets_set_anthropic_prompts_and_redacts_output(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(
        "situ.harness.cli.commands.secrets.command.getpass.getpass",
        lambda _prompt: "  sk-cli-test  ",
    )

    code = cli.main(["secrets", "set", "anthropic", "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    store = LocalSecretStore()
    assert code == 0
    assert captured.err == ""
    assert store.get_anthropic_key() == "sk-cli-test"
    assert payload["secret"] == "anthropic"
    assert payload["changed"] is True
    assert payload["anthropic"] == {"configured": True, "source": "local"}
    assert payload["logfire"] == {"configured": False, "source": "missing"}
    assert "sk-cli-test" not in captured.out
    assert "sk-cli-test" not in captured.err


def test_secrets_set_logfire_prompts_and_redacts_output(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(
        "situ.harness.cli.commands.secrets.command.getpass.getpass",
        lambda _prompt: "  logfire-cli-test  ",
    )

    code = cli.main(["secrets", "set", "logfire", "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    store = LocalSecretStore()
    assert code == 0
    assert captured.err == ""
    assert store.get_logfire_token() == "logfire-cli-test"
    assert payload["secret"] == "logfire"
    assert payload["changed"] is True
    assert payload["anthropic"] == {"configured": False, "source": "missing"}
    assert payload["logfire"] == {"configured": True, "source": "local"}
    assert "logfire-cli-test" not in captured.out
    assert "logfire-cli-test" not in captured.err


def test_secrets_unset_one_secret_and_clear_all(
    capsys: pytest.CaptureFixture[str],
) -> None:
    store = LocalSecretStore()
    store.set_anthropic_key("sk-cli-test")
    store.set_logfire_token("logfire-cli-test")

    unset_code = cli.main(["secrets", "unset", "logfire", "--json"])
    unset_capture = capsys.readouterr()
    unset_payload = json.loads(unset_capture.out)

    assert unset_code == 0
    assert unset_payload["secret"] == "logfire"
    assert unset_payload["changed"] is True
    assert unset_payload["anthropic"] == {"configured": True, "source": "local"}
    assert unset_payload["logfire"] == {"configured": False, "source": "missing"}
    assert store.get_anthropic_key() == "sk-cli-test"
    assert store.get_logfire_token() is None

    clear_code = cli.main(["secrets", "clear", "--json"])
    clear_capture = capsys.readouterr()
    clear_payload = json.loads(clear_capture.out)

    assert clear_code == 0
    assert clear_payload["changed"] is True
    assert clear_payload["anthropic"] == {"configured": False, "source": "missing"}
    assert clear_payload["logfire"] == {"configured": False, "source": "missing"}
    assert store.get_anthropic_key() is None
    assert store.path.exists() is False


def test_secrets_status_human_output_is_redacted(
    capsys: pytest.CaptureFixture[str],
) -> None:
    store = LocalSecretStore()
    store.set_anthropic_key("sk-cli-test")

    code = cli.main(["secrets", "status"])

    captured = capsys.readouterr()
    assert code == 0
    assert "anthropic: configured" in captured.out
    assert "logfire: missing" in captured.out
    assert "sk-cli-test" not in captured.out
