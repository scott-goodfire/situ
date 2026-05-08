from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ...repositories import Repositories
from .schemas import CurrentStateSchema


class CurrentStateService(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    repos: Repositories

    async def get(self) -> CurrentStateSchema:
        return CurrentStateSchema(
            workspace=await self.repos.workspaces.get(),
            projects=await self.repos.projects.list_all(),
            sessions=await self.repos.sessions.list_all(),
            hypotheses=await self.repos.hypotheses.list_all(),
            baselines=await self.repos.baselines.list_all(),
            experiments=await self.repos.experiments.list_all(),
            evaluations=await self.repos.evaluations.list_all(),
            measurements=await self.repos.measurements.list_all(),
            hypothesis_experiment_links=await self.repos.hypothesis_experiment_links.list_all(),
            agents=await self.repos.agents.list_all(),
            tasks=await self.repos.tasks.list_all(),
            task_dependencies=await self.repos.task_dependencies.list_all(),
            task_entity_links=await self.repos.task_entity_links.list_all(),
            task_activities=await self.repos.task_activities.list_all(),
            analyses=await self.repos.analyses.list_all(),
            analysis_activities=await self.repos.analysis_activities.list_all(),
            hypothesis_activities=await self.repos.hypothesis_activities.list_all(),
            experiment_activities=await self.repos.experiment_activities.list_all(),
            evaluation_activities=await self.repos.evaluation_activities.list_all(),
            artifacts=await self.repos.artifacts.list_all(),
            events=await self.repos.events.list_all(),
        )
