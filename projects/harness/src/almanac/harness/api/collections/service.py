from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...records import EventRecord
from ...repositories import Repositories
from .schemas import CollectionsBootstrapSchema


class CollectionsService(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    repos: Repositories

    def bootstrap(self) -> CollectionsBootstrapSchema:
        events = self.repos.events.list_all()
        return CollectionsBootstrapSchema(
            cursor=self.cursor(events),
            runs=self.repos.runs.list_all(),
            experiments=self.repos.experiments.list_all(),
            events=events,
        )

    def current_cursor(self) -> int:
        return self.cursor(self.repos.events.list_all())

    @staticmethod
    def cursor(events: list[EventRecord]) -> int:
        return events[-1].id if events else 0
