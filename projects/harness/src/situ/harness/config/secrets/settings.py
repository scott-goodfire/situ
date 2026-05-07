from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from .store import LocalSecretStore

OpenAIKeySource = Literal["environment", "local", "missing"]


class SituSecrets(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="SITU_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    logfire_token: SecretStr | None = None
    openai_key: SecretStr | None = None

    def logfire_token_value(self) -> str | None:
        return self._secret_value(self.logfire_token)

    def openai_key_value(self, *, home: Path | None = None) -> str | None:
        configured = self._secret_value(self.openai_key)
        if configured is not None:
            return configured
        return LocalSecretStore(home=home).get_openai_key()

    def openai_key_source(self, *, home: Path | None = None) -> OpenAIKeySource:
        if self._secret_value(self.openai_key) is not None:
            return "environment"
        if LocalSecretStore(home=home).get_openai_key() is not None:
            return "local"
        return "missing"

    def apply_sdk_environment(self, *, home: Path | None = None) -> None:
        if logfire_token := self.logfire_token_value():
            os.environ["LOGFIRE_TOKEN"] = logfire_token
        if openai_key := self.openai_key_value(home=home):
            os.environ["OPENAI_API_KEY"] = openai_key

    def require_logfire_token(self) -> str:
        token = self.logfire_token_value()
        if token is None:
            raise RuntimeError(
                "Evals require SITU_LOGFIRE_TOKEN so eval executions are sent to Logfire."
            )
        return token

    def require_openai_key(self, *, home: Path | None = None) -> str:
        key = self.openai_key_value(home=home)
        if key is None:
            raise RuntimeError(
                "Situ requires SITU_OPENAI_KEY or a saved local OpenAI key; "
                "runtime execution must not fall back to deterministic model output."
            )
        return key

    def _secret_value(self, value: SecretStr | None) -> str | None:
        if value is None:
            return None
        secret = value.get_secret_value()
        return secret or None
