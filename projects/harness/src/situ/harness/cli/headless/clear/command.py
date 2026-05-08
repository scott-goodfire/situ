from __future__ import annotations

import argparse
import asyncio
import shutil

import aiofiles.ospath
import aiosqlite

from ...local_session import read_live_session
from ....core.project_context import ProjectContext
from .._shared.output import write_json
from .._shared.workspace import resolve_existing_workspace, terminate_live_session


def run(args: argparse.Namespace) -> int:
    return asyncio.run(run_async(args))


async def run_async(args: argparse.Namespace) -> int:
    workspace = await resolve_existing_workspace(args)
    if workspace is None:
        return 1

    live_session = await read_live_session(workspace)
    force = bool(getattr(args, "force", False))
    context = await ProjectContext.create(repo_root=workspace)

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
        await terminate_live_session(session=live_session)

    await clear_workspace_records(context)
    await asyncio.to_thread(shutil.rmtree, context.project_dir, ignore_errors=True)
    write_json(
        {
            "workspace": str(workspace),
            "project_id": context.project_id,
            "project_dir": str(context.project_dir),
            "cleared": True,
        }
    )
    return 0


async def clear_workspace_records(context: ProjectContext) -> None:
    if not await aiofiles.ospath.exists(context.database_path):
        return

    async with aiosqlite.connect(context.database_path) as connection:
        await connection.create_function(
            "situ_workspace_id",
            0,
            lambda: context.workspace_id,
        )
        await connection.execute("PRAGMA foreign_keys = OFF")
        try:
            params = (context.workspace_id,)
            for sql in (
                """
                DELETE FROM measurements
                WHERE created_in_session_id IN (
                  SELECT id FROM sessions WHERE workspace_id = ?
                )
                OR evaluation_id IN (
                  SELECT id FROM evaluations
                  WHERE project_id IN (
                    SELECT id FROM projects WHERE workspace_id = ?
                  )
                )
                """,
                """
                DELETE FROM evaluation_activities
                WHERE created_in_session_id IN (
                  SELECT id FROM sessions WHERE workspace_id = ?
                )
                OR evaluation_id IN (
                  SELECT id FROM evaluations
                  WHERE project_id IN (
                    SELECT id FROM projects WHERE workspace_id = ?
                  )
                )
                """,
                """
                DELETE FROM experiment_activities
                WHERE created_in_session_id IN (
                  SELECT id FROM sessions WHERE workspace_id = ?
                )
                OR experiment_id IN (
                  SELECT id FROM experiments
                  WHERE project_id IN (
                    SELECT id FROM projects WHERE workspace_id = ?
                  )
                )
                """,
                """
                DELETE FROM hypothesis_activities
                WHERE created_in_session_id IN (
                  SELECT id FROM sessions WHERE workspace_id = ?
                )
                OR hypothesis_id IN (
                  SELECT id FROM hypotheses
                  WHERE project_id IN (
                    SELECT id FROM projects WHERE workspace_id = ?
                  )
                )
                """,
                """
                DELETE FROM analysis_activities
                WHERE created_in_session_id IN (
                  SELECT id FROM sessions WHERE workspace_id = ?
                )
                OR analysis_id IN (
                  SELECT id FROM analyses
                  WHERE project_id IN (
                    SELECT id FROM projects WHERE workspace_id = ?
                  )
                )
                """,
                """
                DELETE FROM task_activities
                WHERE created_in_session_id IN (
                  SELECT id FROM sessions WHERE workspace_id = ?
                )
                OR project_id IN (
                  SELECT id FROM projects WHERE workspace_id = ?
                )
                """,
            ):
                await connection.execute(sql, params * 2)

            for table in (
                "hypothesis_experiment_links",
                "task_dependencies",
                "task_entity_links",
                "artifacts",
                "agent_message_history",
                "tasks",
                "agents",
                "analyses",
                "evaluations",
                "baselines",
                "experiments",
                "hypotheses",
                "events",
                "sessions",
                "projects",
            ):
                await clear_table_for_workspace(connection, table, context.workspace_id)
            await connection.execute("DELETE FROM workspaces WHERE id = ?", params)
            await connection.commit()
        except Exception:
            await connection.rollback()
            raise
        finally:
            await connection.execute("PRAGMA foreign_keys = ON")


async def clear_table_for_workspace(
    connection: aiosqlite.Connection,
    table: str,
    workspace_id: str,
) -> None:
    if table == "hypothesis_experiment_links":
        await connection.execute(
            """
            DELETE FROM hypothesis_experiment_links
            WHERE hypothesis_id IN (
              SELECT id FROM hypotheses
              WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = ?)
            )
            OR experiment_id IN (
              SELECT id FROM experiments
              WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = ?)
            )
            """,
            (workspace_id, workspace_id),
        )
        return

    if table == "events":
        await connection.execute(
            """
            DELETE FROM events
            WHERE associated_project_id IN (
              SELECT id FROM projects WHERE workspace_id = ?
            )
            OR associated_session_id IN (
              SELECT id FROM sessions WHERE workspace_id = ?
            )
            OR json_extract(payload_json, '$.workspace_id') = ?
            OR (
              associated_project_id IS NULL
              AND associated_session_id IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM workspaces WHERE id != ?
              )
            )
            """,
            (workspace_id, workspace_id, workspace_id, workspace_id),
        )
        return

    workspace_column_tables = {"sessions", "projects"}
    if table in workspace_column_tables:
        await connection.execute(
            f"DELETE FROM {table} WHERE workspace_id = ?",
            (workspace_id,),
        )
        return

    await connection.execute(
        f"""
        DELETE FROM {table}
        WHERE project_id IN (
          SELECT id FROM projects WHERE workspace_id = ?
        )
        """,
        (workspace_id,),
    )
