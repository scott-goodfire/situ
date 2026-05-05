from __future__ import annotations

from ..base.command import RepositoryCommand


class LinkHypothesisExperiment(RepositoryCommand):
    hypothesis_id: str
    experiment_id: str
    note: str = ""
