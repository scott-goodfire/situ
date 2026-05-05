from __future__ import annotations

from situ.harness.config import DEFAULTS, SituSecrets


def eval_model_name() -> str:
    ensure_eval_model_credentials()
    return DEFAULTS.eval_model


def ensure_eval_model_credentials() -> None:
    secrets = SituSecrets()
    secrets.require_openai_key()
    secrets.apply_sdk_environment()
