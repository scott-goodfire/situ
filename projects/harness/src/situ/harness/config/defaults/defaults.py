from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict

ModelThinking = Literal["minimal", "low", "medium", "high", "xhigh"]


class SituDefaults(BaseModel):
    model_config = ConfigDict(frozen=True)

    agent_model: str = "anthropic:claude-opus-4-7"
    eval_model: str = "anthropic:claude-opus-4-7"
    model_thinking: ModelThinking = "low"
    agent_model_max_tokens: int = 8_192
    anthropic_compaction_token_threshold: int = 150_000
    harness_logfire_service_name: str = "situ-harness"
    eval_logfire_service_name: str = "situ-evals"
    local_environment: str = "local"
    eval_environment: str = "evals"
    dbos_app_name: str = "situ-harness"
    dbos_log_level: str = "WARNING"
    dbos_sqlite_busy_timeout_seconds: float = 60
    dbos_sqlite_synchronous: str = "NORMAL"
    dbos_notification_polling_interval_seconds: float = 2
    dbos_turso_pool_size: int = 20
    dbos_turso_max_overflow: int = 0
    task_dispatch_interval_seconds: int = 10
    task_workflow_claim_timeout_seconds: int = 120
    researcher_queue_concurrency: int = 4
    critic_review_queue_concurrency: int = 4
    critic_review_max_noop_attempts: int = 3
    scientist_queue_concurrency: int = 2
    scheduler_unhealthy_failure_threshold: int = 3
    scheduler_unhealthy_window_seconds: int = 1_800
    compute_stale_lease_seconds: int = 1_800
    compute_stale_receipt_grace_seconds: int = 900
    eval_timeout_seconds: int = 120
    agent_model_request_timeout_seconds: float = 240
    agent_workflow_timeout_seconds: float = 900
    local_state_home: Path = Path("~/.situ")

    def local_state_home_path(self) -> Path:
        return self.local_state_home.expanduser()

    def model_settings(self) -> dict[str, object]:
        return {
            "thinking": self.model_thinking,
            "max_tokens": self.agent_model_max_tokens,
            "timeout": self.agent_model_request_timeout_seconds,
            "anthropic_cache": True,
            "anthropic_cache_instructions": True,
            "anthropic_cache_tool_definitions": True,
        }


DEFAULTS = SituDefaults()
