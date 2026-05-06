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
        workspace = self.repos.workspaces.get()
        return CollectionsBootstrapSchema(
            cursor=self.cursor(events),
            workspaces=[workspace] if workspace is not None else [],
            projects=self.repos.projects.list_all(),
            sessions=self.repos.sessions.list_all(),
            hypotheses=self.repos.hypotheses.list_all(),
            experiments=self.repos.experiments.list_all(),
            evaluations=self.repos.evaluations.list_all(),
            hypothesis_experiment_links=self.repos.hypothesis_experiment_links.list_all(),
            agents=self.repos.agents.list_all(),
            tasks=self.repos.tasks.list_all(),
            task_dependencies=self.repos.task_dependencies.list_all(),
            task_entity_links=self.repos.task_entity_links.list_all(),
            task_activities=self.repos.task_activities.list_all(),
            analyses=self.repos.analyses.list_all(),
            analysis_activities=self.repos.analysis_activities.list_all(),
            hypothesis_activities=self.repos.hypothesis_activities.list_all(),
            experiment_activities=self.repos.experiment_activities.list_all(),
            evaluation_activities=self.repos.evaluation_activities.list_all(),
            artifacts=self.repos.artifacts.list_all(),
            events=events,
        )

    def current_cursor(self) -> int:
        return self.cursor(self.repos.events.list_all())

    @staticmethod
    def cursor(events: list[EventRecord]) -> int:
        return events[-1].id if events else 0
