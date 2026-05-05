from __future__ import annotations

import logfire

from almanac.harness.config import DEFAULTS, AlmanacSecrets

_CONFIGURED = False


def configure_eval_observability() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    secrets = AlmanacSecrets()
    secrets.require_logfire_token()
    secrets.apply_sdk_environment()

    logfire.configure(
        send_to_logfire="always",
        service_name=DEFAULTS.eval_logfire_service_name,
        environment=DEFAULTS.eval_environment,
        console=False,
    )
    logfire.instrument_pydantic_ai()
    _CONFIGURED = True
