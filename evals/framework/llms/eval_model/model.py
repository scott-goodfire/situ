from __future__ import annotations

from situ.harness.config import DEFAULTS, SituSecrets


async def eval_model_name() -> str:
    await ensure_eval_model_credentials()
    return DEFAULTS.eval_model


async def ensure_eval_model_credentials() -> None:
    await SituSecrets().require_eval_environment()
