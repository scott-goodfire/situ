from __future__ import annotations

import logfire

from situ.harness.config import DEFAULTS, SituSecrets

_CONFIGURED = False


def configure_eval_observability() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    SituSecrets().require_eval_environment()

    logfire.configure(
        send_to_logfire="always",
        service_name=DEFAULTS.eval_logfire_service_name,
        environment=DEFAULTS.eval_environment,
        console=False,
        scrubbing=False,
    )
    logfire.instrument_pydantic_ai()
    _CONFIGURED = True
