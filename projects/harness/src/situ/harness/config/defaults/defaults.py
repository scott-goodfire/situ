from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, ConfigDict


class SituDefaults(BaseModel):
    model_config = ConfigDict(frozen=True)

    agent_model: str = "openai:gpt-5.5"
    eval_model: str = "openai:gpt-5.5"
    harness_logfire_service_name: str = "situ-harness"
    eval_logfire_service_name: str = "situ-evals"
    local_environment: str = "local"
    eval_environment: str = "evals"
    dbos_app_name: str = "situ-harness"
    dbos_log_level: str = "WARNING"
    eval_timeout_seconds: int = 120
    local_state_home: Path = Path("~/.situ")

    def local_state_home_path(self) -> Path:
        return self.local_state_home.expanduser()


DEFAULTS = SituDefaults()
