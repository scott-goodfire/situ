from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from ..defaults import DEFAULTS

OPENAI_KEY_NAME = "openai_key"


class LocalSecretStore:
    def __init__(self, home: Path | None = None) -> None:
        self.home = home.expanduser() if home is not None else DEFAULTS.local_state_home_path()
        self.path = self.home / "secrets.json"

    def get_openai_key(self) -> str | None:
        value = self._read().get(OPENAI_KEY_NAME)
        if not isinstance(value, str):
            return None
        stripped = value.strip()
        return stripped or None

    def set_openai_key(self, value: str) -> None:
        stripped = value.strip()
        if not stripped:
            raise ValueError("OpenAI key cannot be empty.")
        secrets = self._read()
        secrets[OPENAI_KEY_NAME] = stripped
        self._write(secrets)

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
