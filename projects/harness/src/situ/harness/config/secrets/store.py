from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from ..defaults import DEFAULTS

LOGFIRE_TOKEN_NAME = "logfire_token"
ANTHROPIC_KEY_NAME = "anthropic_key"


class LocalSecretStore:
    def __init__(self, home: Path | None = None) -> None:
        self.home = home.expanduser() if home is not None else DEFAULTS.local_state_home_path()
        self.path = self.home / "secrets.json"

    def get_anthropic_key(self) -> str | None:
        return self._get_secret(ANTHROPIC_KEY_NAME)

    def set_anthropic_key(self, value: str) -> None:
        self._set_secret(ANTHROPIC_KEY_NAME, value, label="Anthropic key")

    def unset_anthropic_key(self) -> bool:
        return self._unset_secret(ANTHROPIC_KEY_NAME)

    def get_logfire_token(self) -> str | None:
        return self._get_secret(LOGFIRE_TOKEN_NAME)

    def set_logfire_token(self, value: str) -> None:
        self._set_secret(LOGFIRE_TOKEN_NAME, value, label="Logfire token")

    def unset_logfire_token(self) -> bool:
        return self._unset_secret(LOGFIRE_TOKEN_NAME)

    def clear(self) -> bool:
        try:
            self.path.unlink()
        except FileNotFoundError:
            return False
        return True

    def _get_secret(self, name: str) -> str | None:
        value = self._read().get(name)
        if not isinstance(value, str):
            return None
        stripped = value.strip()
        return stripped or None

    def _set_secret(self, name: str, value: str, *, label: str) -> None:
        stripped = value.strip()
        if not stripped:
            raise ValueError(f"{label} cannot be empty.")
        secrets = self._read()
        secrets[name] = stripped
        self._write(secrets)

    def _unset_secret(self, name: str) -> bool:
        secrets = self._read()
        if name not in secrets:
            return False

        del secrets[name]
        if secrets:
            self._write(secrets)
        else:
            self.clear()
        return True

    def _read(self) -> dict[str, Any]:
        try:
            raw = self.path.read_text()
        except FileNotFoundError:
            return {}

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return {}

        return parsed if isinstance(parsed, dict) else {}

    def _write(self, value: dict[str, Any]) -> None:
        self.home.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(self.home, 0o700)
        except OSError:
            pass

        payload = json.dumps(value, indent=2, sort_keys=True) + "\n"
        fd = os.open(
            self.path,
            os.O_WRONLY | os.O_CREAT | os.O_TRUNC,
            0o600,
        )
        with os.fdopen(fd, "w") as file:
            file.write(payload)
        try:
            os.chmod(self.path, 0o600)
        except OSError:
            pass
