from __future__ import annotations

import argparse
import shutil

from ...local_session import read_live_session
from ....core.project_context import ProjectContext
from .._shared.output import write_json
from .._shared.workspace import resolve_existing_workspace, terminate_live_session


def run(args: argparse.Namespace) -> int:
    workspace = resolve_existing_workspace(args)
    if workspace is None:
        return 1

    live_session = read_live_session(workspace)
    force = bool(getattr(args, "force", False))
    context = ProjectContext(repo_root=workspace)

    if live_session is not None and not force:
        write_json(
            {
                "workspace": str(workspace),
                "project_id": context.project_id,
                "project_dir": str(context.project_dir),
                "cleared": False,
                "reason": "active_harness",
                "message": "active harness found; stop it first or rerun with --force",
                "session": live_session,
            }
        )
        return 1

    if live_session is not None:
        terminate_live_session(session=live_session)

    shutil.rmtree(context.project_dir, ignore_errors=True)
    write_json(
        {
            "workspace": str(workspace),
            "project_id": context.project_id,
            "project_dir": str(context.project_dir),
            "cleared": True,
        }
    )
    return 0
