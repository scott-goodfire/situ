from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from .store import LocalSecretStore

OpenAIKeySource = Literal["local", "missing"]


class SituSecrets(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="SITU_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    logfire_token: SecretStr | None = None
    openai_key: SecretStr | None = None

    def eval_logfire_token_value(self) -> str | None:
        return self._secret_value(self.logfire_token)

    def eval_openai_key_value(self) -> str | None:
        return self._secret_value(self.openai_key)

    def local_logfire_token_value(self, *, home: Path | None = None) -> str | None:
        return LocalSecretStore(home=home).get_logfire_token()

    def local_openai_key_value(self, *, home: Path | None = None) -> str | None:
        return LocalSecretStore(home=home).get_openai_key()

    def openai_key_source(self, *, home: Path | None = None) -> OpenAIKeySource:
        if LocalSecretStore(home=home).get_openai_key() is not None:
            return "local"
        return "missing"

    def logfire_token_source(self, *, home: Path | None = None) -> OpenAIKeySource:
        if LocalSecretStore(home=home).get_logfire_token() is not None:
            return "local"
        return "missing"

    def apply_local_sdk_environment(self, *, home: Path | None = None) -> None:
        self._set_or_remove_env(
            "LOGFIRE_TOKEN",
            self.local_logfire_token_value(home=home),
        )
        self._set_or_remove_env(
            "OPENAI_API_KEY",
            self.local_openai_key_value(home=home),
        )

    def apply_eval_sdk_environment(self) -> None:
        logfire_token = self.eval_logfire_token_value()
        openai_key = self.eval_openai_key_value()
        missing = []
        if logfire_token is None:
            missing.append("SITU_LOGFIRE_TOKEN")
        if openai_key is None:
            missing.append("SITU_OPENAI_KEY")
        if missing:
            raise RuntimeError(
                "Evals require SITU_OPENAI_KEY and SITU_LOGFIRE_TOKEN; "
                f"missing {', '.join(missing)}."
            )

        assert logfire_token is not None
        assert openai_key is not None
        os.environ["LOGFIRE_TOKEN"] = logfire_token
        os.environ["OPENAI_API_KEY"] = openai_key

    def require_eval_environment(self) -> None:
        self.apply_eval_sdk_environment()

    def require_eval_logfire_token(self) -> str:
        token = self.eval_logfire_token_value()
        if token is None:
            raise RuntimeError(
                "Evals require SITU_LOGFIRE_TOKEN so eval executions are sent to Logfire."
            )
        return token

    def require_eval_openai_key(self) -> str:
        key = self.eval_openai_key_value()
        if key is None:
            raise RuntimeError(
                "Evals require SITU_OPENAI_KEY for real model calls."
            )
        return key

    def require_local_openai_key(self, *, home: Path | None = None) -> str:
        key = self.local_openai_key_value(home=home)
        if key is None:
            raise RuntimeError(
                "Local Situ execution requires a saved local OpenAI key; "
                "runtime execution must not use SITU_OPENAI_KEY or fall back to "
                "deterministic model output."
            )
        return key

    def _set_or_remove_env(self, name: str, value: str | None) -> None:
        if value is None:
            os.environ.pop(name, None)
            return
        os.environ[name] = value

    def _secret_value(self, value: SecretStr | None) -> str | None:
        if value is None:
            return None
        secret = value.get_secret_value()
        return secret or None
