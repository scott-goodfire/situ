from __future__ import annotations

import hashlib
import os
from pathlib import Path


class ProjectContext:
    def __init__(self, repo_root: Path) -> None:
        self.repo_root = repo_root.resolve()
        self.project_id = hashlib.sha256(str(self.repo_root).encode()).hexdigest()[:16]
        home = Path(os.environ.get("ALMANAC_HOME", "~/.almanac")).expanduser()
        self.project_dir = home / "projects" / self.project_id
        self.project_dir.mkdir(parents=True, exist_ok=True)
