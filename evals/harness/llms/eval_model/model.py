from __future__ import annotations

import os

DEFAULT_EVAL_MODEL = "openai:gpt-5.5"


def eval_model_name() -> str:
    ensure_eval_model_credentials()
    return os.environ.get("ALMANAC_EVAL_MODEL") or os.environ.get("ALMANAC_AGENT_MODEL") or DEFAULT_EVAL_MODEL


def ensure_eval_model_credentials() -> None:
    openai_key = os.environ.get("ALMANAC_OPENAI_KEY")
    if openai_key and not os.environ.get("OPENAI_API_KEY"):
        os.environ["OPENAI_API_KEY"] = openai_key

    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError(
            "AI evals require a real model key. Set ALMANAC_OPENAI_KEY or OPENAI_API_KEY; "
            "evals must not fall back to deterministic model output."
        )
