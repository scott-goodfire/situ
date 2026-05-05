from __future__ import annotations

import os
from urllib.parse import quote


def logfire_experiment_url(experiment_name: str) -> str | None:
    base_url = os.environ.get("ALMANAC_LOGFIRE_EVALS_BASE_URL")
    if not base_url:
        return None
    return f"{base_url.rstrip('/')}/{quote(experiment_name, safe='')}"
