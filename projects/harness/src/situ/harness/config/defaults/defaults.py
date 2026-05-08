from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict

ModelThinking = Literal["minimal", "low", "medium", "high", "xhigh"]


class SituDefaults(BaseModel):
    model_config = ConfigDict(frozen=True)

    agent_model: str = "anthropic:claude-sonnet-4-6"
    eval_model: str = "anthropic:claude-sonnet-4-6"
    model_thinking: ModelThinking = "low"
    anthropic_compaction_token_threshold: int = 150_000
    harness_logfire_service_name: str = "situ-harness"
    eval_logfire_service_name: str = "situ-evals"
    local_environment: str = "local"
    eval_environment: str = "evals"
    dbos_app_name: str = "situ-harness"
    dbos_log_level: str = "WARNING"
    eval_timeout_seconds: int = 120
    agent_model_request_timeout_seconds: float = 240
    agent_workflow_timeout_seconds: float = 900
    local_state_home: Path = Path("~/.situ")

    def local_state_home_path(self) -> Path:
        return self.local_state_home.expanduser()

    def model_settings(self) -> dict[str, object]:
        return {
            "thinking": self.model_thinking,
            "timeout": self.agent_model_request_timeout_seconds,
            "anthropic_cache": True,
            "anthropic_cache_instructions": True,
            "anthropic_cache_tool_definitions": True,
        }


DEFAULTS = SituDefaults()
