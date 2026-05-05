from __future__ import annotations

import os

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class AlmanacSecrets(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="ALMANAC_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    logfire_token: SecretStr | None = None
    openai_key: SecretStr | None = None

    def logfire_token_value(self) -> str | None:
        return self._secret_value(self.logfire_token)

    def openai_key_value(self) -> str | None:
        return self._secret_value(self.openai_key)

    def apply_sdk_environment(self) -> None:
        if logfire_token := self.logfire_token_value():
            os.environ["LOGFIRE_TOKEN"] = logfire_token
        if openai_key := self.openai_key_value():
            os.environ["OPENAI_API_KEY"] = openai_key

    def require_logfire_token(self) -> str:
        token = self.logfire_token_value()
        if token is None:
            raise RuntimeError(
                "Evals require ALMANAC_LOGFIRE_TOKEN so eval executions are sent to Logfire."
            )
        return token

    def require_openai_key(self) -> str:
        key = self.openai_key_value()
        if key is None:
            raise RuntimeError(
                "Evals require ALMANAC_OPENAI_KEY; evals must not fall back to deterministic model output."
            )
        return key

    def _secret_value(self, value: SecretStr | None) -> str | None:
        if value is None:
            return None
        secret = value.get_secret_value()
        return secret or None
