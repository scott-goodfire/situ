from __future__ import annotations

import hashlib
from pathlib import Path

from ..config import DEFAULTS


class ProjectContext:
    def __init__(self, repo_root: Path, home: Path | None = None) -> None:
        self.repo_root = repo_root.resolve()
        self.project_id = hashlib.sha256(str(self.repo_root).encode()).hexdigest()[:16]
        root = home.expanduser() if home is not None else DEFAULTS.local_state_home_path()
        self.home = root
        self.project_dir = root / "projects" / self.project_id
        self.project_dir.mkdir(parents=True, exist_ok=True)
