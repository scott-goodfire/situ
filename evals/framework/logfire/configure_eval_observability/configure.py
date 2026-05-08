from __future__ import annotations

import logfire

from situ.harness.config import DEFAULTS, SituSecrets

_CONFIGURED = False


async def configure_eval_observability() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    await SituSecrets().require_eval_environment()

    logfire.configure(
        send_to_logfire="always",
        service_name=DEFAULTS.eval_logfire_service_name,
        environment=DEFAULTS.eval_environment,
        console=logfire.ConsoleOptions(min_log_level="info", show_project_link=False),
        scrubbing=False,
    )
    logfire.instrument_pydantic_ai()
    _CONFIGURED = True
