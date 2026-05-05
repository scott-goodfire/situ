from __future__ import annotations

from ..repository_command import RepositoryCommand


class AddWarning(RepositoryCommand):
    run_id: str
    kind: str
    message: str
    experiment_id: str | None = None
