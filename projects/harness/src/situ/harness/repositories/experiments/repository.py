from __future__ import annotations

from typing import Any

from ...core.db.fts import normalize_fts_query
from ...core.db.serialization import utc_now
from ...core.ids import (
    RECORD_ID_PREFIXES,
    ensure_canonical_record_id,
    next_canonical_record_id,
)
from ...records import ExperimentRecord, RecordStatus, parse_record_status
from ..base import BaseRepository
from .command import CreateExperiment, UpdateExperiment

EXPERIMENT_ID_PREFIX = RECORD_ID_PREFIXES["experiment"]


def _experiment_row(row: Any) -> ExperimentRecord:
    return ExperimentRecord(
        id=row["id"],
        project_id=row["project_id"],
        created_in_session_id=row["created_in_session_id"],
        status=row["status"],
        title=row["title"],
        summary=row["summary"],
        worktree_path=row["worktree_path"],
        base_commit=row["base_commit"],
        candidate_commit=row["candidate_commit"],
        parent_experiment_id=row["parent_experiment_id"],
        research_thread=row["research_thread"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class ExperimentsRepository(BaseRepository):
    async def create(
        self,
        *,
        experiment_id: str,
        project_id: str,
        title: str,
        summary: str,
        created_in_session_id: str | None = None,
        status: RecordStatus | str = RecordStatus.TRIAGE,
        worktree_path: str | None = None,
        base_commit: str | None = None,
        candidate_commit: str | None = None,
        parent_experiment_id: str | None = None,
        research_thread: str | None = None,
    ) -> ExperimentRecord:
        ensure_canonical_record_id(
            record_id=experiment_id,
            prefix=EXPERIMENT_ID_PREFIX,
            noun="experiment",
        )
        checked_status = parse_record_status(status=status, noun="experiment")
        command = CreateExperiment(
            experiment_id=experiment_id,
            project_id=project_id,
            created_in_session_id=created_in_session_id,
            title=title,
            summary=summary,
            status=checked_status,
            worktree_path=worktree_path,
            base_commit=base_commit,
            candidate_commit=candidate_commit,
            parent_experiment_id=parent_experiment_id,
            research_thread=research_thread,
        )
        now = utc_now()
        await self.db.execute(
            """
            INSERT INTO experiments
              (id, project_id, created_in_session_id, status, title, summary,
               worktree_path, base_commit, candidate_commit, parent_experiment_id,
               research_thread, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.experiment_id,
                command.project_id,
                command.created_in_session_id,
                command.status.value,
                command.title,
                command.summary,
                command.worktree_path,
                command.base_commit,
                command.candidate_commit,
                command.parent_experiment_id,
                command.research_thread,
                now,
                now,
            ),
        )
        record = await self.get_by_id(experiment_id=command.experiment_id)
        if record is None:
            raise RuntimeError(f"experiment was not persisted: {command.experiment_id}")
        return record

    async def update(
        self,
        *,
        experiment_id: str,
        title: str | None = None,
        summary: str | None = None,
        status: RecordStatus | str | None = None,
        worktree_path: str | None = None,
        base_commit: str | None = None,
        candidate_commit: str | None = None,
        parent_experiment_id: str | None = None,
        research_thread: str | None = None,
    ) -> ExperimentRecord | None:
        checked_status = (
            parse_record_status(status=status, noun="experiment")
            if status is not None
            else None
        )
        command = UpdateExperiment(
            experiment_id=experiment_id,
            title=title,
            summary=summary,
            status=checked_status,
            worktree_path=worktree_path,
            base_commit=base_commit,
            candidate_commit=candidate_commit,
            parent_experiment_id=parent_experiment_id,
            research_thread=research_thread,
        )
        current = await self.get_by_id(experiment_id=command.experiment_id)
        if current is None:
            return None

        await self.db.execute(
            """
            UPDATE experiments
            SET title = ?,
                summary = ?,
                status = ?,
                worktree_path = ?,
                base_commit = ?,
                candidate_commit = ?,
                parent_experiment_id = ?,
                research_thread = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                command.title if command.title is not None else current.title,
                command.summary if command.summary is not None else current.summary,
                command.status.value if command.status is not None else current.status.value,
                (
                    command.worktree_path
                    if command.worktree_path is not None
                    else current.worktree_path
                ),
                command.base_commit if command.base_commit is not None else current.base_commit,
                (
                    command.candidate_commit
                    if command.candidate_commit is not None
                    else current.candidate_commit
                ),
                (
                    command.parent_experiment_id
                    if command.parent_experiment_id is not None
                    else current.parent_experiment_id
                ),
                (
                    command.research_thread
                    if command.research_thread is not None
                    else current.research_thread
                ),
                utc_now(),
                command.experiment_id,
            ),
        )
        return await self.get_by_id(experiment_id=command.experiment_id)

    async def get_by_id(self, *, experiment_id: str) -> ExperimentRecord | None:
        row = await self.db.fetchone("SELECT * FROM experiments WHERE id = ?", (experiment_id,))
        return _experiment_row(row) if row else None

    async def get(self, *, experiment_id: str) -> ExperimentRecord | None:
        return await self.get_by_id(experiment_id=experiment_id)

    async def list_all(self) -> list[ExperimentRecord]:
        return [
            _experiment_row(row)
            for row in await self.db.fetchall("SELECT * FROM experiments ORDER BY created_at")
        ]

    async def list_for_project(self, *, project_id: str) -> list[ExperimentRecord]:
        return [
            _experiment_row(row)
            for row in await self.db.fetchall(
                "SELECT * FROM experiments WHERE project_id = ? ORDER BY created_at",
                (project_id,),
            )
        ]

    async def list_for_session(self, *, session_id: str) -> list[ExperimentRecord]:
        session = await self.db.fetchone("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        project_id = session["project_id"] if session else None
        return (
            await self.list_for_project(project_id=project_id)
            if project_id is not None
            else []
        )

    async def search(
        self,
        *,
        project_id: str,
        query: str,
        limit: int = 20,
        status: RecordStatus | str | None = None,
    ) -> list[tuple[ExperimentRecord, str]]:
        normalized = normalize_fts_query(query)
        if not normalized:
            return []
        where = ["experiments_fts MATCH ?", "experiments_fts.project_id = ?"]
        params: list[Any] = [normalized, project_id]
        if status is not None:
            where.append("experiments.status = ?")
            params.append(parse_record_status(status=status, noun="experiment").value)
        params.append(limit)
        sql = f"""
            SELECT experiments.*,
                   snippet(experiments_fts, -1, '[', ']', '...', 12) AS _snippet
            FROM experiments_fts
            JOIN experiments ON experiments.id = experiments_fts.experiment_id
            WHERE {" AND ".join(where)}
            ORDER BY bm25(experiments_fts)
            LIMIT ?
        """
        rows = await self.db.fetchall(sql, tuple(params))
        return [(_experiment_row(row), row["_snippet"]) for row in rows]

    async def next_id(self, *, project_id: str) -> str:
        rows = await self.db.fetchall("SELECT id FROM experiments")
        return next_canonical_record_id(
            existing_ids=(str(row["id"]) for row in rows),
            prefix=EXPERIMENT_ID_PREFIX,
        )
