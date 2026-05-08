from __future__ import annotations

import asyncio
import time

from dbos import DBOS, DBOSConfig, Queue, SetEnqueueOptions, SetWorkflowID
import pytest
from sqlalchemy import text

from situ.harness.core.dbos import runtime
from situ.harness.core.dbos.turso_sqlalchemy import create_turso_system_engine
from situ.harness.core.db import Database
from situ.harness.records import TaskKind, TaskStatus
from situ.harness.repositories import Repositories


def test_launch_dbos_uses_thread_without_running_event_loop(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime.reset_dbos_for_tests()
    observed = {"called": False, "running_loop": True}

    def fake_launch() -> None:
        observed["called"] = True
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            observed["running_loop"] = False

    monkeypatch.setattr(runtime.DBOS, "launch", fake_launch)

    async def launch_inside_event_loop() -> None:
        runtime.launch_dbos()

    asyncio.run(launch_inside_event_loop())

    assert observed == {"called": True, "running_loop": False}
    runtime.reset_dbos_for_tests()


def test_turso_system_engine_uses_mvcc_and_contention_pragmas(tmp_path) -> None:
    engine = create_turso_system_engine(path=tmp_path / "dbos.sqlite")
    try:
        with engine.begin() as connection:
            journal_mode = connection.execute(text("PRAGMA journal_mode")).scalar()
            busy_timeout = connection.execute(text("PRAGMA busy_timeout")).scalar()
            synchronous = connection.execute(text("PRAGMA synchronous")).scalar()
            foreign_keys = connection.execute(text("PRAGMA foreign_keys")).scalar()
            connection.execute(text("CREATE TABLE smoke (id INTEGER PRIMARY KEY)"))
            connection.execute(text("INSERT INTO smoke(id) VALUES (1)"))

        with engine.connect() as connection:
            rows = connection.execute(text("SELECT id FROM smoke")).fetchall()

        assert journal_mode == "mvcc"
        assert busy_timeout >= 60_000
        assert synchronous == 1
        assert foreign_keys == 1
        assert rows == [(1,)]
    finally:
        engine.dispose()


def test_turso_system_engine_allows_overlapping_write_transactions(tmp_path) -> None:
    engine = create_turso_system_engine(path=tmp_path / "dbos.sqlite")
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE smoke (id INTEGER PRIMARY KEY)"))

        connection_1 = engine.connect()
        transaction_1 = connection_1.begin()
        connection_2 = engine.connect()
        transaction_2 = connection_2.begin()
        try:
            connection_1.execute(text("INSERT INTO smoke(id) VALUES (1)"))
            connection_2.execute(text("INSERT INTO smoke(id) VALUES (2)"))

            transaction_1.commit()
            transaction_2.commit()
        finally:
            connection_1.close()
            connection_2.close()

        with engine.connect() as connection:
            rows = connection.execute(
                text("SELECT id FROM smoke ORDER BY id")
            ).fetchall()

        assert rows == [(1,), (2,)]
    finally:
        engine.dispose()


def test_turso_system_engine_runs_real_queued_workflows(tmp_path) -> None:
    runtime.reset_dbos_for_tests()
    try:
        config: DBOSConfig = {
            "name": "situ-test-turso-queue",
            "system_database_engine": create_turso_system_engine(
                path=tmp_path / "dbos.sqlite",
            ),
            "use_listen_notify": False,
            "notification_listener_polling_interval_sec": 0.1,
            "log_level": "ERROR",
            "executor_id": "test",
        }
        DBOS(config=config)
        queue = Queue(
            "situ-test-turso-queue",
            concurrency=4,
            partition_queue=True,
            polling_interval_sec=0.1,
        )

        @DBOS.workflow(name="situ.test.turso_queued_increment")
        async def queued_increment(value: int) -> int:
            return value + 1

        runtime.launch_dbos()

        async def exercise_queue() -> list[int]:
            workflow_ids: list[str] = []
            for value in range(8):
                workflow_id = f"turso-queue-smoke:{value}"
                workflow_ids.append(workflow_id)
                with SetWorkflowID(workflow_id):
                    with SetEnqueueOptions(queue_partition_key="P1"):
                        await queue.enqueue_async(queued_increment, value)

            deadline = time.monotonic() + 5
            while True:
                statuses = [
                    await DBOS.get_workflow_status_async(workflow_id)
                    for workflow_id in workflow_ids
                ]
                status_values = [
                    str(getattr(status.status, "value", status.status))
                    if status is not None
                    else ""
                    for status in statuses
                ]
                if all(value == "SUCCESS" for value in status_values):
                    break
                if time.monotonic() >= deadline:
                    raise AssertionError(
                        f"queued workflows did not finish: {status_values}"
                    )
                await asyncio.sleep(0.1)

            return [
                await DBOS.get_result_async(workflow_id)
                for workflow_id in workflow_ids
            ]

        results = asyncio.run(exercise_queue())

        assert results == list(range(1, 9))
    finally:
        runtime.reset_dbos_for_tests()


def test_real_queued_workflows_claim_harness_tasks_under_concurrency(tmp_path) -> None:
    runtime.reset_dbos_for_tests()
    db_path = tmp_path / "situ.sqlite"
    repo_path = str(tmp_path / "workspace")
    workspace_id = "W1"
    project_id = "P1"
    session_id = "S1"
    agent_id = "agent_P1_scientist"
    task_ids = [f"T{index}" for index in range(1, 9)]

    async def seed_tasks() -> None:
        db = await Database.open(
            db_path,
            workspace_id=workspace_id,
            repo_path=repo_path,
        )
        repos = Repositories.create(db)
        workspace = await repos.workspaces.ensure()
        await repos.projects.create(
            project_id=project_id,
            workspace_id=workspace.id,
            title="Queue smoke",
            objective="Exercise queued task claims.",
            research_context="Synthetic DBOS harness task claim test.",
        )
        await repos.sessions.create(
            session_id=session_id,
            workspace_id=workspace.id,
            project_id=project_id,
        )
        await repos.agents.create(
            agent_id=agent_id,
            project_id=project_id,
            created_in_session_id=session_id,
            kind="scientist",
            display_name="Scientist",
        )
        for task_id in task_ids:
            await repos.tasks.create(
                task_id=task_id,
                project_id=project_id,
                created_in_session_id=session_id,
                title=f"Experiment {task_id}",
                content="Claim and finish this task.",
                kind=TaskKind.EXPERIMENT,
                priority="high",
                source_kind="manager",
            )
            await repos.tasks.set_workflow_id(
                task_id=task_id,
                workflow_id=f"task:{task_id}:a1",
            )

    asyncio.run(seed_tasks())

    try:
        config: DBOSConfig = {
            "name": "situ-test-harness-task-claims",
            "system_database_engine": create_turso_system_engine(
                path=tmp_path / "dbos.sqlite",
            ),
            "use_listen_notify": False,
            "notification_listener_polling_interval_sec": 0.1,
            "log_level": "ERROR",
            "executor_id": "test",
        }
        DBOS(config=config)
        queue = Queue(
            "situ-test-harness-task-claims",
            concurrency=4,
            partition_queue=True,
            polling_interval_sec=0.1,
        )

        @DBOS.workflow(name="situ.test.claim_harness_task")
        async def claim_harness_task(task_id: str) -> str:
            db = await Database.open(
                db_path,
                workspace_id=workspace_id,
                repo_path=repo_path,
            )
            repos = Repositories.create(db)
            claimed = await repos.tasks.claim(
                task_id=task_id,
                agent_id=agent_id,
                eligible_kinds=[TaskKind.EXPERIMENT],
                claimed_in_session_id=session_id,
            )
            if claimed is None:
                return "missed"
            await repos.tasks.update(
                task_id=task_id,
                status=TaskStatus.DONE,
                result_summary="Claimed by DBOS queue smoke workflow.",
                completed_in_session_id=session_id,
            )
            return task_id

        runtime.launch_dbos()

        async def exercise_queue() -> tuple[list[str], list[tuple[str, str]]]:
            workflow_ids: list[str] = []
            for task_id in task_ids:
                workflow_id = f"harness-task-claim:{task_id}"
                workflow_ids.append(workflow_id)
                with SetWorkflowID(workflow_id):
                    with SetEnqueueOptions(queue_partition_key=project_id):
                        await queue.enqueue_async(claim_harness_task, task_id)

            deadline = time.monotonic() + 10
            while True:
                statuses = [
                    await DBOS.get_workflow_status_async(workflow_id)
                    for workflow_id in workflow_ids
                ]
                status_values = [
                    str(getattr(status.status, "value", status.status))
                    if status is not None
                    else ""
                    for status in statuses
                ]
                if all(value == "SUCCESS" for value in status_values):
                    break
                if time.monotonic() >= deadline:
                    raise AssertionError(
                        f"queued task claims did not finish: {status_values}"
                    )
                await asyncio.sleep(0.1)

            results = [
                await DBOS.get_result_async(workflow_id)
                for workflow_id in workflow_ids
            ]
            db = await Database.open(
                db_path,
                workspace_id=workspace_id,
                repo_path=repo_path,
            )
            repos = Repositories.create(db)
            rows = [
                (task.id, task.status.value)
                for task in await repos.tasks.list_for_project(project_id=project_id)
            ]
            return results, rows

        results, rows = asyncio.run(exercise_queue())

        assert results == task_ids
        assert rows == [(task_id, "done") for task_id in task_ids]
    finally:
        runtime.reset_dbos_for_tests()
