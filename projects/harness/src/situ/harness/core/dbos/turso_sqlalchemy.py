from __future__ import annotations

from pathlib import Path
from typing import Any

import turso
from sqlalchemy import create_engine, event
from sqlalchemy.dialects import registry
from sqlalchemy.dialects.sqlite.pysqlite import SQLiteDialect_pysqlite
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool

from ...config import DEFAULTS

_DIALECT_NAME = "sqlite.turso"
_DIALECT_URL = "sqlite+turso://"


class TursoConnectionAdapter:
    """DB-API compatibility shim for SQLAlchemy's SQLite dialect hooks."""

    def __init__(self, inner: Any) -> None:
        self._inner = inner
        self._pending_begin = False

    def __getattr__(self, name: str) -> Any:
        return getattr(self._inner, name)

    def cursor(self, *args: Any, **kwargs: Any) -> "TursoCursorAdapter":
        return TursoCursorAdapter(
            inner=self._inner.cursor(*args, **kwargs),
            connection=self,
        )

    def execute(
        self,
        sql: str,
        parameters: Any = (),
    ) -> "TursoCursorAdapter":
        cursor = self.cursor()
        cursor.execute(sql=sql, parameters=parameters)
        return cursor

    def commit(self) -> None:
        self._pending_begin = False
        self._inner.commit()

    def rollback(self) -> None:
        self._pending_begin = False
        self._inner.rollback()

    def begin_sqlalchemy_transaction(self) -> None:
        self._pending_begin = True

    def start_transaction_for_statement(self, *, sql: str) -> None:
        if not self._pending_begin or _skips_deferred_begin(sql=sql):
            return

        begin_sql = (
            "BEGIN"
            if _requires_exclusive_transaction(sql=sql)
            else "BEGIN CONCURRENT"
        )
        self._inner.execute(begin_sql)
        self._pending_begin = False

    def create_function(self, *_args: Any, **_kwargs: Any) -> None:
        """Turso does not support Python-defined SQL functions.

        SQLAlchemy registers helper functions on pysqlite connections during
        initialization. DBOS does not depend on those helpers, so this is a
        harmless compatibility no-op.
        """
        return None


class TursoCursorAdapter:
    """Cursor wrapper that starts Turso transactions lazily."""

    def __init__(self, *, inner: Any, connection: TursoConnectionAdapter) -> None:
        self._inner = inner
        self._connection = connection

    def __getattr__(self, name: str) -> Any:
        return getattr(self._inner, name)

    def execute(
        self,
        sql: str,
        parameters: Any = (),
    ) -> "TursoCursorAdapter":
        self._connection.start_transaction_for_statement(sql=sql)
        self._inner.execute(sql, parameters)
        return self

    def executemany(
        self,
        sql: str,
        seq_of_parameters: Any,
    ) -> "TursoCursorAdapter":
        self._connection.start_transaction_for_statement(sql=sql)
        self._inner.executemany(sql, seq_of_parameters)
        return self


class TursoDialect(SQLiteDialect_pysqlite):
    driver = "turso"
    supports_statement_cache = True

    @classmethod
    def import_dbapi(cls) -> Any:
        return turso

    def get_isolation_level(self, _dbapi_connection: Any) -> str:
        return "SERIALIZABLE"

    def set_isolation_level(self, _dbapi_connection: Any, _level: str) -> None:
        return None

    def do_begin(self, dbapi_connection: Any) -> None:
        dbapi_connection.begin_sqlalchemy_transaction()


def create_turso_system_engine(*, path: Path) -> Engine:
    """Create a DBOS system engine backed by embedded Turso Database."""
    register_turso_dialect()
    path.parent.mkdir(parents=True, exist_ok=True)

    def creator() -> TursoConnectionAdapter:
        connection = TursoConnectionAdapter(turso.connect(str(path)))
        _execute_connection_pragma(
            dbapi_connection=connection,
            sql="PRAGMA journal_mode = 'mvcc'",
        )
        return connection

    engine = create_engine(
        _DIALECT_URL,
        creator=creator,
        poolclass=QueuePool,
        pool_size=DEFAULTS.dbos_turso_pool_size,
        max_overflow=DEFAULTS.dbos_turso_max_overflow,
        pool_pre_ping=True,
    )

    @event.listens_for(engine, "connect")
    def _configure_turso_connection(
        dbapi_connection: Any,
        _connection_record: Any,
    ) -> None:
        _execute_connection_pragma(
            dbapi_connection=dbapi_connection,
            sql=(
                "PRAGMA busy_timeout = "
                f"{int(DEFAULTS.dbos_sqlite_busy_timeout_seconds * 1000)}"
            ),
        )
        _execute_connection_pragma(
            dbapi_connection=dbapi_connection,
            sql=f"PRAGMA synchronous = {DEFAULTS.dbos_sqlite_synchronous}",
        )
        _execute_connection_pragma(
            dbapi_connection=dbapi_connection,
            sql="PRAGMA foreign_keys = ON",
        )

    return engine


def register_turso_dialect() -> None:
    registry.register(_DIALECT_NAME, __name__, "TursoDialect")


def _execute_connection_pragma(*, dbapi_connection: Any, sql: str) -> None:
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute(sql)
        cursor.fetchall()
    finally:
        cursor.close()


def _first_statement_token(*, sql: str) -> str:
    parts = sql.lstrip().split(None, 1)
    if not parts:
        return ""
    return parts[0].upper()


def _skips_deferred_begin(*, sql: str) -> bool:
    token = _first_statement_token(sql=sql)
    return token in {
        "BEGIN",
        "COMMIT",
        "PRAGMA",
        "RELEASE",
        "ROLLBACK",
        "SAVEPOINT",
        "SELECT",
    }


def _requires_exclusive_transaction(*, sql: str) -> bool:
    token = _first_statement_token(sql=sql)
    return token in {
        "ALTER",
        "CREATE",
        "DROP",
        "REINDEX",
        "VACUUM",
    }
