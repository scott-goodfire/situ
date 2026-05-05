from __future__ import annotations

from pydantic_ai.retries import RetryConfig
from tenacity import stop_after_attempt, wait_exponential


def build_retry_config(retries: int) -> RetryConfig | None:
    if retries <= 0:
        return None
    return {
        "stop": stop_after_attempt(retries + 1),
        "wait": wait_exponential(multiplier=0.1, max=2),
        "reraise": True,
    }
