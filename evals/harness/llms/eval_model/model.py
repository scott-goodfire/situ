from __future__ import annotations

from almanac.harness.config import DEFAULTS, AlmanacSecrets


def eval_model_name() -> str:
    ensure_eval_model_credentials()
    return DEFAULTS.eval_model


def ensure_eval_model_credentials() -> None:
    secrets = AlmanacSecrets()
    secrets.require_openai_key()
    secrets.apply_sdk_environment()
