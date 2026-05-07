from __future__ import annotations

import argparse
import json
from pathlib import Path

from ....core.db import Database
from ....core.paths import resolve_workspace
from ....core.project_context import ProjectContext
from ....repositories import Repositories


def run(args: argparse.Namespace) -> int:
    context = ProjectContext(resolve_workspace(Path.cwd(), args.workspace))
    db = Database(
        context.database_path,
        workspace_id=context.workspace_id,
        repo_path=str(context.repo_root),
    )
    repos = Repositories.create(db)
    patches = [
        artifact
        for artifact in repos.artifacts.list_all()
        if artifact.kind == "patch"
    ]

    if args.json:
        print(json.dumps([patch.model_dump() for patch in patches], indent=2))
        return 0

    if not patches:
        print("No patch artifacts.")
        return 0

    for patch in patches:
        print(
            f"{patch.id} {patch.title} "
            f"({patch.associated_entity_kind} {patch.associated_entity_id})"
        )
        print(f"  path: {patch.path}")
        print(f"  apply: situ apply {patch.id}")
    return 0
