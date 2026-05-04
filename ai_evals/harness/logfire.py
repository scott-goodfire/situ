from __future__ import annotations

import os

import logfire

_CONFIGURED = False


def configure_eval_observability() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    token = os.environ.get("ALMANAC_LOGFIRE_TOKEN")
    if token and not os.environ.get("LOGFIRE_TOKEN"):
        os.environ["LOGFIRE_TOKEN"] = token

    logfire.configure(
        send_to_logfire=os.environ.get("ALMANAC_LOGFIRE_SEND_TO_LOGFIRE", "if-token-present"),
        service_name=os.environ.get("ALMANAC_EVAL_LOGFIRE_SERVICE_NAME", "almanac-ai-evals"),
        environment=os.environ.get("ALMANAC_ENVIRONMENT", "evals"),
        console=False,
    )
    logfire.instrument_pydantic_ai()
    _CONFIGURED = True

