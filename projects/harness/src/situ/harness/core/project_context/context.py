from __future__ import annotations

import hashlib
from pathlib import Path

import aiofiles.os

from ...config import DEFAULTS


class ProjectContext:
    def __init__(self, repo_root: Path, home: Path | None = None) -> None:
        self.repo_root = repo_root.resolve()
        self.workspace_id = hashlib.sha256(str(self.repo_root).encode()).hexdigest()[:16]
        self.project_id = self.workspace_id
        root = home.expanduser() if home is not None else DEFAULTS.local_state_home_path()
        self.home = root
        self.database_path = root / "situ.sqlite"
        self.project_dir = root / "projects" / self.workspace_id

    @classmethod
    async def create(cls, repo_root: Path, home: Path | None = None) -> "ProjectContext":
        context = cls(repo_root=repo_root, home=home)
        await context.initialize()
        return context

    async def initialize(self) -> None:
        await aiofiles.os.makedirs(self.project_dir, exist_ok=True)
