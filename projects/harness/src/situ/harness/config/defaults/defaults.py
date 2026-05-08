from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict

ModelThinking = Literal["minimal", "low", "medium", "high", "xhigh"]
OpenAIReasoningEffort = Literal["none", "minimal", "low", "medium", "high", "xhigh"]


class SituDefaults(BaseModel):
    model_config = ConfigDict(frozen=True)

    agent_model: str = "openai-responses:gpt-5.5"
    eval_model: str = "openai-responses:gpt-5.5"
    model_thinking: ModelThinking = "low"
    openai_reasoning_effort: OpenAIReasoningEffort = "low"
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
            "openai_reasoning_effort": self.openai_reasoning_effort,
            "timeout": self.agent_model_request_timeout_seconds,
        }


DEFAULTS = SituDefaults()
