from __future__ import annotations

import aiosqlite


DATABASE_SCHEMA_VERSION = 7


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  repo_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  research_context TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  project_id TEXT REFERENCES projects(id),
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hypotheses (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  worktree_path TEXT,
  base_commit TEXT,
  candidate_commit TEXT,
  parent_experiment_id TEXT REFERENCES experiments(id),
  research_thread TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS baselines (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  associated_baseline_id TEXT REFERENCES baselines(id),
  associated_experiment_id TEXT REFERENCES experiments(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  created_by_agent_id TEXT REFERENCES agents(id),
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  supersedes_analysis_id TEXT REFERENCES analyses(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hypothesis_experiment_links (
  hypothesis_id TEXT NOT NULL REFERENCES hypotheses(id),
  experiment_id TEXT NOT NULL REFERENCES experiments(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (hypothesis_id, experiment_id)
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  kind TEXT NOT NULL,
  display_name TEXT NOT NULL,
  model_name TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS compute_targets (
  id TEXT PRIMARY KEY,
  pool TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT,
  status TEXT NOT NULL,
  claimed_by_task_id TEXT REFERENCES tasks(id),
  claimed_at TEXT,
  last_heartbeat TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS compute_targets_pool_status
  ON compute_targets(pool, status);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  kind TEXT NOT NULL,
  work_type TEXT,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  assignee_id TEXT REFERENCES agents(id),
  parent_task_id TEXT REFERENCES tasks(id),
  payload_json TEXT NOT NULL,
  pydantic_run_id TEXT,
  conversation_id TEXT,
  result_summary TEXT,
  workflow_id TEXT,
  created_at TEXT NOT NULL,
  available_at TEXT NOT NULL,
  claimed_in_session_id TEXT REFERENCES sessions(id),
  claimed_at TEXT,
  completed_in_session_id TEXT REFERENCES sessions(id),
  completed_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  purpose TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  target_id TEXT NOT NULL,
  status TEXT NOT NULL,
  owner_workflow_id TEXT,
  attempt INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL,
  claimed_at TEXT,
  lease_expires_at TEXT,
  completed_at TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS work_items_open_target_unique
  ON work_items(project_id, purpose, target_kind, target_id)
  WHERE status IN ('pending', 'claimed');

CREATE INDEX IF NOT EXISTS work_items_project_purpose_status_available
  ON work_items(project_id, purpose, status, available_at);

CREATE INDEX IF NOT EXISTS work_items_owner_workflow_id
  ON work_items(owner_workflow_id);

CREATE TABLE IF NOT EXISTS task_dependencies (
  project_id TEXT NOT NULL REFERENCES projects(id),
  task_id TEXT NOT NULL REFERENCES tasks(id),
  blocked_by_task_id TEXT NOT NULL REFERENCES tasks(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (task_id, blocked_by_task_id)
);

CREATE TABLE IF NOT EXISTS task_entity_links (
  project_id TEXT NOT NULL REFERENCES projects(id),
  task_id TEXT NOT NULL REFERENCES tasks(id),
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (task_id, entity_kind, entity_id, relationship)
);

CREATE TABLE IF NOT EXISTS task_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  task_id TEXT NOT NULL REFERENCES tasks(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  actor_agent_id TEXT REFERENCES agents(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analysis_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id TEXT NOT NULL REFERENCES analyses(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hypothesis_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hypothesis_id TEXT NOT NULL REFERENCES hypotheses(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS baseline_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  baseline_id TEXT NOT NULL REFERENCES baselines(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS experiment_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experiment_id TEXT NOT NULL REFERENCES experiments(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluation_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  actor TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  actor TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  associated_entity_kind TEXT NOT NULL,
  associated_entity_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  path TEXT NOT NULL,
  media_type TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_message_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_in_session_id TEXT REFERENCES sessions(id),
  agent_id TEXT REFERENCES agents(id),
  agent_name TEXT NOT NULL,
  pydantic_run_id TEXT,
  conversation_id TEXT,
  messages_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  associated_project_id TEXT REFERENCES projects(id),
  associated_session_id TEXT REFERENCES sessions(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS continuation_claims (
  claim_key TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  session_id TEXT REFERENCES sessions(id),
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS continuation_claims_project_kind_idx
  ON continuation_claims(project_id, kind, created_at);

CREATE TABLE IF NOT EXISTS collection_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope_id TEXT NOT NULL,
  scope_seq INTEGER NOT NULL,
  collection TEXT NOT NULL,
  record_key TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete')),
  record_json TEXT,
  source_event_id INTEGER REFERENCES events(id),
  created_at TEXT NOT NULL,
  UNIQUE(scope_id, scope_seq)
);

CREATE INDEX IF NOT EXISTS collection_changes_scope_seq_idx
  ON collection_changes(scope_id, scope_seq);
"""


def _json_object(fields: dict[str, str]) -> str:
    pairs = []
    for key, value in fields.items():
        pairs.extend((f"'{key}'", value))
    return f"json_object({', '.join(pairs)})"


def _project_scope(project_id_sql: str) -> str:
    return f"(SELECT workspace_id FROM projects WHERE id = {project_id_sql})"


def _session_scope(session_id_sql: str) -> str:
    return f"(SELECT workspace_id FROM sessions WHERE id = {session_id_sql})"


def _change_insert_sql(
    *,
    scope_sql: str,
    collection: str,
    key_sql: str,
    operation: str,
    record_sql: str,
    source_event_sql: str = "NULL",
) -> str:
    return f"""
  INSERT INTO collection_changes
    (scope_id, scope_seq, collection, record_key, operation,
     record_json, source_event_id, created_at)
  SELECT
    scope.scope_id,
    (
      SELECT COALESCE(MAX(scope_seq), 0) + 1
      FROM collection_changes
      WHERE scope_id = scope.scope_id
    ),
    '{collection}',
    {key_sql},
    '{operation}',
    {record_sql},
    {source_event_sql},
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  FROM (SELECT {scope_sql} AS scope_id) AS scope
  WHERE scope.scope_id IS NOT NULL;
"""


def _outbox_triggers(
    *,
    table: str,
    collection: str,
    insert_scope_sql: str,
    insert_key_sql: str,
    insert_record_sql: str,
    update_scope_sql: str | None = None,
    update_key_sql: str | None = None,
    update_record_sql: str | None = None,
    delete_scope_sql: str | None = None,
    delete_key_sql: str | None = None,
    source_event_sql: str = "NULL",
) -> str:
    update_scope_sql = update_scope_sql or insert_scope_sql
    update_key_sql = update_key_sql or insert_key_sql
    update_record_sql = update_record_sql or insert_record_sql
    delete_scope_sql = delete_scope_sql or update_scope_sql.replace("NEW.", "OLD.")
    delete_key_sql = delete_key_sql or update_key_sql.replace("NEW.", "OLD.")
    return f"""
CREATE TRIGGER IF NOT EXISTS collection_outbox_{table}_insert
AFTER INSERT ON {table}
BEGIN
{_change_insert_sql(scope_sql=insert_scope_sql, collection=collection, key_sql=insert_key_sql, operation="upsert", record_sql=insert_record_sql, source_event_sql=source_event_sql)}
END;

CREATE TRIGGER IF NOT EXISTS collection_outbox_{table}_update
AFTER UPDATE ON {table}
BEGIN
{_change_insert_sql(scope_sql=update_scope_sql, collection=collection, key_sql=update_key_sql, operation="upsert", record_sql=update_record_sql, source_event_sql=source_event_sql)}
END;

CREATE TRIGGER IF NOT EXISTS collection_outbox_{table}_delete
AFTER DELETE ON {table}
BEGIN
{_change_insert_sql(scope_sql=delete_scope_sql, collection=collection, key_sql=delete_key_sql, operation="delete", record_sql="NULL")}
END;
"""


def _compute_target_change_sql(
    *,
    task_scope_sql: str,
    key_sql: str,
    operation: str,
    record_sql: str,
) -> str:
    return f"""
  INSERT INTO collection_changes
    (scope_id, scope_seq, collection, record_key, operation,
     record_json, source_event_id, created_at)
  SELECT
    scope.scope_id,
    (
      SELECT COALESCE(MAX(scope_seq), 0) + 1
      FROM collection_changes
      WHERE scope_id = scope.scope_id
    ),
    'compute_targets',
    {key_sql},
    '{operation}',
    {record_sql},
    NULL,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  FROM (
    SELECT {task_scope_sql} AS scope_id
    WHERE {task_scope_sql} IS NOT NULL
    UNION
    SELECT id FROM workspaces
    WHERE {task_scope_sql} IS NULL
  ) AS scope
  WHERE scope.scope_id IS NOT NULL;
"""


def _compute_target_outbox_triggers() -> str:
    record_sql = _json_object(
        {
            "id": "NEW.id",
            "pool": "NEW.pool",
            "kind": "NEW.kind",
            "label": "NEW.label",
            "status": "NEW.status",
            "claimed_by_task_id": "NEW.claimed_by_task_id",
            "claimed_at": "NEW.claimed_at",
            "last_heartbeat": "NEW.last_heartbeat",
            "metadata": "json(NEW.metadata_json)",
            "created_at": "NEW.created_at",
            "updated_at": "NEW.updated_at",
        }
    )
    new_task_scope = (
        "(SELECT p.workspace_id FROM tasks t JOIN projects p ON p.id = t.project_id "
        "WHERE t.id = NEW.claimed_by_task_id)"
    )
    old_task_scope = (
        "(SELECT p.workspace_id FROM tasks t JOIN projects p ON p.id = t.project_id "
        "WHERE t.id = OLD.claimed_by_task_id)"
    )
    return f"""
CREATE TRIGGER IF NOT EXISTS collection_outbox_compute_targets_insert
AFTER INSERT ON compute_targets
BEGIN
{_compute_target_change_sql(task_scope_sql=new_task_scope, key_sql="NEW.id", operation="upsert", record_sql=record_sql)}
END;

CREATE TRIGGER IF NOT EXISTS collection_outbox_compute_targets_update
AFTER UPDATE ON compute_targets
BEGIN
{_compute_target_change_sql(task_scope_sql=f"COALESCE({new_task_scope}, {old_task_scope})", key_sql="NEW.id", operation="upsert", record_sql=record_sql)}
END;

CREATE TRIGGER IF NOT EXISTS collection_outbox_compute_targets_delete
AFTER DELETE ON compute_targets
BEGIN
{_compute_target_change_sql(task_scope_sql=old_task_scope, key_sql="OLD.id", operation="delete", record_sql="NULL")}
END;
"""


COLLECTION_OUTBOX_SQL = "\n".join(
    [
        _outbox_triggers(
            table="workspaces",
            collection="workspaces",
            insert_scope_sql="NEW.id",
            insert_key_sql="NEW.id",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "repo_path": "NEW.repo_path",
                    "created_at": "NEW.created_at",
                    "updated_at": "NEW.updated_at",
                }
            ),
        ),
        _outbox_triggers(
            table="projects",
            collection="projects",
            insert_scope_sql="NEW.workspace_id",
            insert_key_sql="NEW.id",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "workspace_id": "NEW.workspace_id",
                    "title": "NEW.title",
                    "objective": "NEW.objective",
                    "research_context": "NEW.research_context",
                    "status": "NEW.status",
                    "created_at": "NEW.created_at",
                    "updated_at": "NEW.updated_at",
                }
            ),
        ),
        _outbox_triggers(
            table="sessions",
            collection="sessions",
            insert_scope_sql="NEW.workspace_id",
            insert_key_sql="NEW.id",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "workspace_id": "NEW.workspace_id",
                    "project_id": "NEW.project_id",
                    "status": "NEW.status",
                    "created_at": "NEW.created_at",
                    "updated_at": "NEW.updated_at",
                }
            ),
        ),
        _outbox_triggers(
            table="hypotheses",
            collection="hypotheses",
            insert_scope_sql=_project_scope("NEW.project_id"),
            insert_key_sql="NEW.id",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "project_id": "NEW.project_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "title": "NEW.title",
                    "summary": "NEW.summary",
                    "status": "NEW.status",
                    "created_at": "NEW.created_at",
                    "updated_at": "NEW.updated_at",
                }
            ),
        ),
        _outbox_triggers(
            table="experiments",
            collection="experiments",
            insert_scope_sql=_project_scope("NEW.project_id"),
            insert_key_sql="NEW.id",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "project_id": "NEW.project_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "status": "NEW.status",
                    "title": "NEW.title",
                    "summary": "NEW.summary",
                    "worktree_path": "NEW.worktree_path",
                    "base_commit": "NEW.base_commit",
                    "candidate_commit": "NEW.candidate_commit",
                    "parent_experiment_id": "NEW.parent_experiment_id",
                    "research_thread": "NEW.research_thread",
                    "created_at": "NEW.created_at",
                    "updated_at": "NEW.updated_at",
                }
            ),
        ),
        _outbox_triggers(
            table="baselines",
            collection="baselines",
            insert_scope_sql=_project_scope("NEW.project_id"),
            insert_key_sql="NEW.id",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "project_id": "NEW.project_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "status": "NEW.status",
                    "title": "NEW.title",
                    "summary": "NEW.summary",
                    "created_at": "NEW.created_at",
                    "updated_at": "NEW.updated_at",
                }
            ),
        ),
        _outbox_triggers(
            table="evaluations",
            collection="evaluations",
            insert_scope_sql=_project_scope("NEW.project_id"),
            insert_key_sql="NEW.id",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "project_id": "NEW.project_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "status": "NEW.status",
                    "title": "NEW.title",
                    "summary": "NEW.summary",
                    "associated_baseline_id": "NEW.associated_baseline_id",
                    "associated_experiment_id": "NEW.associated_experiment_id",
                    "created_at": "NEW.created_at",
                    "updated_at": "NEW.updated_at",
                }
            ),
        ),
        _outbox_triggers(
            table="analyses",
            collection="analyses",
            insert_scope_sql=_project_scope("NEW.project_id"),
            insert_key_sql="NEW.id",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "project_id": "NEW.project_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "created_by_agent_id": "NEW.created_by_agent_id",
                    "status": "NEW.status",
                    "title": "NEW.title",
                    "summary": "NEW.summary",
                    "content": "NEW.content",
                    "supersedes_analysis_id": "NEW.supersedes_analysis_id",
                    "created_at": "NEW.created_at",
                    "updated_at": "NEW.updated_at",
                }
            ),
        ),
        _outbox_triggers(
            table="hypothesis_experiment_links",
            collection="hypothesis_experiment_links",
            insert_scope_sql=(
                "COALESCE("
                "(SELECT p.workspace_id FROM hypotheses h JOIN projects p ON p.id = h.project_id "
                "WHERE h.id = NEW.hypothesis_id), "
                "(SELECT p.workspace_id FROM experiments e JOIN projects p ON p.id = e.project_id "
                "WHERE e.id = NEW.experiment_id))"
            ),
            insert_key_sql="NEW.hypothesis_id || ':' || NEW.experiment_id",
            insert_record_sql=_json_object(
                {
                    "hypothesis_id": "NEW.hypothesis_id",
                    "experiment_id": "NEW.experiment_id",
                    "created_at": "NEW.created_at",
                }
            ),
        ),
        _outbox_triggers(
            table="agents",
            collection="agents",
            insert_scope_sql=_project_scope("NEW.project_id"),
            insert_key_sql="NEW.id",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "project_id": "NEW.project_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "kind": "NEW.kind",
                    "display_name": "NEW.display_name",
                    "model_name": "NEW.model_name",
                    "status": "NEW.status",
                    "created_at": "NEW.created_at",
                    "updated_at": "NEW.updated_at",
                }
            ),
        ),
        _compute_target_outbox_triggers(),
        _outbox_triggers(
            table="tasks",
            collection="tasks",
            insert_scope_sql=_project_scope("NEW.project_id"),
            insert_key_sql="NEW.id",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "project_id": "NEW.project_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "title": "NEW.title",
                    "content": "NEW.content",
                    "kind": "NEW.kind",
                    "work_type": "NEW.work_type",
                    "status": "NEW.status",
                    "priority": "NEW.priority",
                    "source_kind": "NEW.source_kind",
                    "assignee_id": "NEW.assignee_id",
                    "parent_task_id": "NEW.parent_task_id",
                    "payload": "json(NEW.payload_json)",
                    "pydantic_run_id": "NEW.pydantic_run_id",
                    "conversation_id": "NEW.conversation_id",
                    "result_summary": "NEW.result_summary",
                    "workflow_id": "NEW.workflow_id",
                    "created_at": "NEW.created_at",
                    "available_at": "NEW.available_at",
                    "claimed_in_session_id": "NEW.claimed_in_session_id",
                    "claimed_at": "NEW.claimed_at",
                    "completed_in_session_id": "NEW.completed_in_session_id",
                    "completed_at": "NEW.completed_at",
                    "updated_at": "NEW.updated_at",
                }
            ),
        ),
        _outbox_triggers(
            table="task_dependencies",
            collection="task_dependencies",
            insert_scope_sql=_project_scope("NEW.project_id"),
            insert_key_sql="NEW.task_id || ':' || NEW.blocked_by_task_id",
            insert_record_sql=_json_object(
                {
                    "project_id": "NEW.project_id",
                    "task_id": "NEW.task_id",
                    "blocked_by_task_id": "NEW.blocked_by_task_id",
                    "created_at": "NEW.created_at",
                }
            ),
        ),
        _outbox_triggers(
            table="task_entity_links",
            collection="task_entity_links",
            insert_scope_sql=_project_scope("NEW.project_id"),
            insert_key_sql=(
                "NEW.task_id || ':' || NEW.entity_kind || ':' || "
                "NEW.entity_id || ':' || NEW.relationship"
            ),
            insert_record_sql=_json_object(
                {
                    "project_id": "NEW.project_id",
                    "task_id": "NEW.task_id",
                    "entity_kind": "NEW.entity_kind",
                    "entity_id": "NEW.entity_id",
                    "relationship": "NEW.relationship",
                    "created_at": "NEW.created_at",
                }
            ),
        ),
        _outbox_triggers(
            table="task_activities",
            collection="task_activities",
            insert_scope_sql=_project_scope("NEW.project_id"),
            insert_key_sql="CAST(NEW.id AS TEXT)",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "project_id": "NEW.project_id",
                    "task_id": "NEW.task_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "actor_agent_id": "NEW.actor_agent_id",
                    "actor": "NEW.actor",
                    "kind": "NEW.kind",
                    "body": "NEW.body",
                    "payload": "json(NEW.payload_json)",
                    "created_at": "NEW.created_at",
                }
            ),
        ),
        _outbox_triggers(
            table="analysis_activities",
            collection="analysis_activities",
            insert_scope_sql=(
                "COALESCE("
                "(SELECT p.workspace_id FROM analyses a JOIN projects p ON p.id = a.project_id "
                "WHERE a.id = NEW.analysis_id), "
                f"{_session_scope('NEW.created_in_session_id')})"
            ),
            insert_key_sql="CAST(NEW.id AS TEXT)",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "analysis_id": "NEW.analysis_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "actor": "NEW.actor",
                    "kind": "NEW.kind",
                    "body": "NEW.body",
                    "payload": "json(NEW.payload_json)",
                    "created_at": "NEW.created_at",
                }
            ),
        ),
        _outbox_triggers(
            table="hypothesis_activities",
            collection="hypothesis_activities",
            insert_scope_sql=(
                "COALESCE("
                "(SELECT p.workspace_id FROM hypotheses h JOIN projects p ON p.id = h.project_id "
                "WHERE h.id = NEW.hypothesis_id), "
                f"{_session_scope('NEW.created_in_session_id')})"
            ),
            insert_key_sql="CAST(NEW.id AS TEXT)",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "hypothesis_id": "NEW.hypothesis_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "actor": "NEW.actor",
                    "kind": "NEW.kind",
                    "body": "NEW.body",
                    "payload": "json(NEW.payload_json)",
                    "created_at": "NEW.created_at",
                }
            ),
        ),
        _outbox_triggers(
            table="baseline_activities",
            collection="baseline_activities",
            insert_scope_sql=(
                "COALESCE("
                "(SELECT p.workspace_id FROM baselines b JOIN projects p ON p.id = b.project_id "
                "WHERE b.id = NEW.baseline_id), "
                f"{_session_scope('NEW.created_in_session_id')})"
            ),
            insert_key_sql="CAST(NEW.id AS TEXT)",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "baseline_id": "NEW.baseline_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "actor": "NEW.actor",
                    "kind": "NEW.kind",
                    "body": "NEW.body",
                    "payload": "json(NEW.payload_json)",
                    "created_at": "NEW.created_at",
                }
            ),
        ),
        _outbox_triggers(
            table="experiment_activities",
            collection="experiment_activities",
            insert_scope_sql=(
                "COALESCE("
                "(SELECT p.workspace_id FROM experiments e JOIN projects p ON p.id = e.project_id "
                "WHERE e.id = NEW.experiment_id), "
                f"{_session_scope('NEW.created_in_session_id')})"
            ),
            insert_key_sql="CAST(NEW.id AS TEXT)",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "experiment_id": "NEW.experiment_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "actor": "NEW.actor",
                    "kind": "NEW.kind",
                    "body": "NEW.body",
                    "payload": "json(NEW.payload_json)",
                    "created_at": "NEW.created_at",
                }
            ),
        ),
        _outbox_triggers(
            table="evaluation_activities",
            collection="evaluation_activities",
            insert_scope_sql=(
                "COALESCE("
                "(SELECT p.workspace_id FROM evaluations e JOIN projects p ON p.id = e.project_id "
                "WHERE e.id = NEW.evaluation_id), "
                f"{_session_scope('NEW.created_in_session_id')})"
            ),
            insert_key_sql="CAST(NEW.id AS TEXT)",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "evaluation_id": "NEW.evaluation_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "actor": "NEW.actor",
                    "kind": "NEW.kind",
                    "body": "NEW.body",
                    "payload": "json(NEW.payload_json)",
                    "created_at": "NEW.created_at",
                }
            ),
        ),
        _outbox_triggers(
            table="measurements",
            collection="measurements",
            insert_scope_sql=(
                "COALESCE("
                "(SELECT p.workspace_id FROM evaluations e JOIN projects p ON p.id = e.project_id "
                "WHERE e.id = NEW.evaluation_id), "
                f"{_session_scope('NEW.created_in_session_id')})"
            ),
            insert_key_sql="NEW.id",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "evaluation_id": "NEW.evaluation_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "actor": "NEW.actor",
                    "body": "NEW.body",
                    "payload": "json(NEW.payload_json)",
                    "created_at": "NEW.created_at",
                }
            ),
        ),
        _outbox_triggers(
            table="artifacts",
            collection="artifacts",
            insert_scope_sql=_project_scope("NEW.project_id"),
            insert_key_sql="NEW.id",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "project_id": "NEW.project_id",
                    "created_in_session_id": "NEW.created_in_session_id",
                    "associated_entity_kind": "NEW.associated_entity_kind",
                    "associated_entity_id": "NEW.associated_entity_id",
                    "kind": "NEW.kind",
                    "title": "NEW.title",
                    "path": "NEW.path",
                    "media_type": "NEW.media_type",
                    "size_bytes": "NEW.size_bytes",
                    "created_at": "NEW.created_at",
                }
            ),
        ),
        _outbox_triggers(
            table="events",
            collection="events",
            insert_scope_sql=(
                "COALESCE("
                f"{_project_scope('NEW.associated_project_id')}, "
                f"{_session_scope('NEW.associated_session_id')}, "
                "json_extract(NEW.payload_json, '$.workspace_id'), "
                "situ_workspace_id())"
            ),
            insert_key_sql="CAST(NEW.id AS TEXT)",
            insert_record_sql=_json_object(
                {
                    "id": "NEW.id",
                    "associated_project_id": "NEW.associated_project_id",
                    "associated_session_id": "NEW.associated_session_id",
                    "type": "NEW.type",
                    "message": "NEW.message",
                    "payload": "json(NEW.payload_json)",
                    "created_at": "NEW.created_at",
                }
            ),
            source_event_sql="NEW.id",
            delete_scope_sql=(
                "COALESCE("
                f"{_project_scope('OLD.associated_project_id')}, "
                f"{_session_scope('OLD.associated_session_id')}, "
                "json_extract(OLD.payload_json, '$.workspace_id'), "
                "situ_workspace_id())"
            ),
        ),
    ]
)


# FTS5 virtual tables and sync triggers for record search.
#
# Each FTS table mirrors the searchable text columns of its source table plus a
# denormalized project_id (UNINDEXED) so search results can be filtered to the
# current project without a JOIN. The source record id is stored UNINDEXED so
# update/delete triggers can find the matching row without relying on rowid
# alignment.
#
# Triggers keep FTS rows in sync on INSERT/UPDATE/DELETE. For measurements,
# project_id is derived at write time from the parent evaluation row.
#
# Search clients should query with `MATCH ? AND project_id = ?` and order by
# `bm25(<table>_fts)` ascending (lower is more relevant in SQLite's FTS5).

FTS_SQL = """
CREATE VIRTUAL TABLE IF NOT EXISTS analyses_fts USING fts5(
  analysis_id UNINDEXED,
  project_id UNINDEXED,
  title,
  summary,
  content,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS analyses_fts_insert AFTER INSERT ON analyses BEGIN
  INSERT INTO analyses_fts(analysis_id, project_id, title, summary, content)
  VALUES (NEW.id, NEW.project_id, NEW.title, NEW.summary, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS analyses_fts_update AFTER UPDATE ON analyses BEGIN
  DELETE FROM analyses_fts WHERE analysis_id = OLD.id;
  INSERT INTO analyses_fts(analysis_id, project_id, title, summary, content)
  VALUES (NEW.id, NEW.project_id, NEW.title, NEW.summary, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS analyses_fts_delete AFTER DELETE ON analyses BEGIN
  DELETE FROM analyses_fts WHERE analysis_id = OLD.id;
END;


CREATE VIRTUAL TABLE IF NOT EXISTS hypotheses_fts USING fts5(
  hypothesis_id UNINDEXED,
  project_id UNINDEXED,
  title,
  summary,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS hypotheses_fts_insert AFTER INSERT ON hypotheses BEGIN
  INSERT INTO hypotheses_fts(hypothesis_id, project_id, title, summary)
  VALUES (NEW.id, NEW.project_id, NEW.title, NEW.summary);
END;

CREATE TRIGGER IF NOT EXISTS hypotheses_fts_update AFTER UPDATE ON hypotheses BEGIN
  DELETE FROM hypotheses_fts WHERE hypothesis_id = OLD.id;
  INSERT INTO hypotheses_fts(hypothesis_id, project_id, title, summary)
  VALUES (NEW.id, NEW.project_id, NEW.title, NEW.summary);
END;

CREATE TRIGGER IF NOT EXISTS hypotheses_fts_delete AFTER DELETE ON hypotheses BEGIN
  DELETE FROM hypotheses_fts WHERE hypothesis_id = OLD.id;
END;


CREATE VIRTUAL TABLE IF NOT EXISTS experiments_fts USING fts5(
  experiment_id UNINDEXED,
  project_id UNINDEXED,
  title,
  summary,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS experiments_fts_insert AFTER INSERT ON experiments BEGIN
  INSERT INTO experiments_fts(experiment_id, project_id, title, summary)
  VALUES (NEW.id, NEW.project_id, NEW.title, NEW.summary);
END;

CREATE TRIGGER IF NOT EXISTS experiments_fts_update AFTER UPDATE ON experiments BEGIN
  DELETE FROM experiments_fts WHERE experiment_id = OLD.id;
  INSERT INTO experiments_fts(experiment_id, project_id, title, summary)
  VALUES (NEW.id, NEW.project_id, NEW.title, NEW.summary);
END;

CREATE TRIGGER IF NOT EXISTS experiments_fts_delete AFTER DELETE ON experiments BEGIN
  DELETE FROM experiments_fts WHERE experiment_id = OLD.id;
END;


CREATE VIRTUAL TABLE IF NOT EXISTS baselines_fts USING fts5(
  baseline_id UNINDEXED,
  project_id UNINDEXED,
  title,
  summary,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS baselines_fts_insert AFTER INSERT ON baselines BEGIN
  INSERT INTO baselines_fts(baseline_id, project_id, title, summary)
  VALUES (NEW.id, NEW.project_id, NEW.title, NEW.summary);
END;

CREATE TRIGGER IF NOT EXISTS baselines_fts_update AFTER UPDATE ON baselines BEGIN
  DELETE FROM baselines_fts WHERE baseline_id = OLD.id;
  INSERT INTO baselines_fts(baseline_id, project_id, title, summary)
  VALUES (NEW.id, NEW.project_id, NEW.title, NEW.summary);
END;

CREATE TRIGGER IF NOT EXISTS baselines_fts_delete AFTER DELETE ON baselines BEGIN
  DELETE FROM baselines_fts WHERE baseline_id = OLD.id;
END;


CREATE VIRTUAL TABLE IF NOT EXISTS evaluations_fts USING fts5(
  evaluation_id UNINDEXED,
  project_id UNINDEXED,
  title,
  summary,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS evaluations_fts_insert AFTER INSERT ON evaluations BEGIN
  INSERT INTO evaluations_fts(evaluation_id, project_id, title, summary)
  VALUES (NEW.id, NEW.project_id, NEW.title, NEW.summary);
END;

CREATE TRIGGER IF NOT EXISTS evaluations_fts_update AFTER UPDATE ON evaluations BEGIN
  DELETE FROM evaluations_fts WHERE evaluation_id = OLD.id;
  INSERT INTO evaluations_fts(evaluation_id, project_id, title, summary)
  VALUES (NEW.id, NEW.project_id, NEW.title, NEW.summary);
END;

CREATE TRIGGER IF NOT EXISTS evaluations_fts_delete AFTER DELETE ON evaluations BEGIN
  DELETE FROM evaluations_fts WHERE evaluation_id = OLD.id;
END;


CREATE VIRTUAL TABLE IF NOT EXISTS measurements_fts USING fts5(
  measurement_id UNINDEXED,
  project_id UNINDEXED,
  evaluation_id UNINDEXED,
  body,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS measurements_fts_insert AFTER INSERT ON measurements BEGIN
  INSERT INTO measurements_fts(measurement_id, project_id, evaluation_id, body)
  SELECT NEW.id, evaluations.project_id, NEW.evaluation_id, NEW.body
  FROM evaluations WHERE evaluations.id = NEW.evaluation_id;
END;

CREATE TRIGGER IF NOT EXISTS measurements_fts_update AFTER UPDATE ON measurements BEGIN
  DELETE FROM measurements_fts WHERE measurement_id = OLD.id;
  INSERT INTO measurements_fts(measurement_id, project_id, evaluation_id, body)
  SELECT NEW.id, evaluations.project_id, NEW.evaluation_id, NEW.body
  FROM evaluations WHERE evaluations.id = NEW.evaluation_id;
END;

CREATE TRIGGER IF NOT EXISTS measurements_fts_delete AFTER DELETE ON measurements BEGIN
  DELETE FROM measurements_fts WHERE measurement_id = OLD.id;
END;


CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
  task_id UNINDEXED,
  project_id UNINDEXED,
  title,
  content,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS tasks_fts_insert AFTER INSERT ON tasks BEGIN
  INSERT INTO tasks_fts(task_id, project_id, title, content)
  VALUES (NEW.id, NEW.project_id, NEW.title, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS tasks_fts_update AFTER UPDATE ON tasks BEGIN
  DELETE FROM tasks_fts WHERE task_id = OLD.id;
  INSERT INTO tasks_fts(task_id, project_id, title, content)
  VALUES (NEW.id, NEW.project_id, NEW.title, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS tasks_fts_delete AFTER DELETE ON tasks BEGIN
  DELETE FROM tasks_fts WHERE task_id = OLD.id;
END;


CREATE VIRTUAL TABLE IF NOT EXISTS analysis_activities_fts USING fts5(
  activity_id UNINDEXED,
  analysis_id UNINDEXED,
  project_id UNINDEXED,
  body,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS analysis_activities_fts_insert
AFTER INSERT ON analysis_activities BEGIN
  INSERT INTO analysis_activities_fts(activity_id, analysis_id, project_id, body)
  SELECT NEW.id, NEW.analysis_id, analyses.project_id, NEW.body
  FROM analyses WHERE analyses.id = NEW.analysis_id;
END;

CREATE TRIGGER IF NOT EXISTS analysis_activities_fts_update
AFTER UPDATE ON analysis_activities BEGIN
  DELETE FROM analysis_activities_fts WHERE activity_id = OLD.id;
  INSERT INTO analysis_activities_fts(activity_id, analysis_id, project_id, body)
  SELECT NEW.id, NEW.analysis_id, analyses.project_id, NEW.body
  FROM analyses WHERE analyses.id = NEW.analysis_id;
END;

CREATE TRIGGER IF NOT EXISTS analysis_activities_fts_delete
AFTER DELETE ON analysis_activities BEGIN
  DELETE FROM analysis_activities_fts WHERE activity_id = OLD.id;
END;


CREATE VIRTUAL TABLE IF NOT EXISTS hypothesis_activities_fts USING fts5(
  activity_id UNINDEXED,
  hypothesis_id UNINDEXED,
  project_id UNINDEXED,
  body,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS hypothesis_activities_fts_insert
AFTER INSERT ON hypothesis_activities BEGIN
  INSERT INTO hypothesis_activities_fts(activity_id, hypothesis_id, project_id, body)
  SELECT NEW.id, NEW.hypothesis_id, hypotheses.project_id, NEW.body
  FROM hypotheses WHERE hypotheses.id = NEW.hypothesis_id;
END;

CREATE TRIGGER IF NOT EXISTS hypothesis_activities_fts_update
AFTER UPDATE ON hypothesis_activities BEGIN
  DELETE FROM hypothesis_activities_fts WHERE activity_id = OLD.id;
  INSERT INTO hypothesis_activities_fts(activity_id, hypothesis_id, project_id, body)
  SELECT NEW.id, NEW.hypothesis_id, hypotheses.project_id, NEW.body
  FROM hypotheses WHERE hypotheses.id = NEW.hypothesis_id;
END;

CREATE TRIGGER IF NOT EXISTS hypothesis_activities_fts_delete
AFTER DELETE ON hypothesis_activities BEGIN
  DELETE FROM hypothesis_activities_fts WHERE activity_id = OLD.id;
END;


CREATE VIRTUAL TABLE IF NOT EXISTS baseline_activities_fts USING fts5(
  activity_id UNINDEXED,
  baseline_id UNINDEXED,
  project_id UNINDEXED,
  body,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS baseline_activities_fts_insert
AFTER INSERT ON baseline_activities BEGIN
  INSERT INTO baseline_activities_fts(activity_id, baseline_id, project_id, body)
  SELECT NEW.id, NEW.baseline_id, baselines.project_id, NEW.body
  FROM baselines WHERE baselines.id = NEW.baseline_id;
END;

CREATE TRIGGER IF NOT EXISTS baseline_activities_fts_update
AFTER UPDATE ON baseline_activities BEGIN
  DELETE FROM baseline_activities_fts WHERE activity_id = OLD.id;
  INSERT INTO baseline_activities_fts(activity_id, baseline_id, project_id, body)
  SELECT NEW.id, NEW.baseline_id, baselines.project_id, NEW.body
  FROM baselines WHERE baselines.id = NEW.baseline_id;
END;

CREATE TRIGGER IF NOT EXISTS baseline_activities_fts_delete
AFTER DELETE ON baseline_activities BEGIN
  DELETE FROM baseline_activities_fts WHERE activity_id = OLD.id;
END;


CREATE VIRTUAL TABLE IF NOT EXISTS experiment_activities_fts USING fts5(
  activity_id UNINDEXED,
  experiment_id UNINDEXED,
  project_id UNINDEXED,
  body,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS experiment_activities_fts_insert
AFTER INSERT ON experiment_activities BEGIN
  INSERT INTO experiment_activities_fts(activity_id, experiment_id, project_id, body)
  SELECT NEW.id, NEW.experiment_id, experiments.project_id, NEW.body
  FROM experiments WHERE experiments.id = NEW.experiment_id;
END;

CREATE TRIGGER IF NOT EXISTS experiment_activities_fts_update
AFTER UPDATE ON experiment_activities BEGIN
  DELETE FROM experiment_activities_fts WHERE activity_id = OLD.id;
  INSERT INTO experiment_activities_fts(activity_id, experiment_id, project_id, body)
  SELECT NEW.id, NEW.experiment_id, experiments.project_id, NEW.body
  FROM experiments WHERE experiments.id = NEW.experiment_id;
END;

CREATE TRIGGER IF NOT EXISTS experiment_activities_fts_delete
AFTER DELETE ON experiment_activities BEGIN
  DELETE FROM experiment_activities_fts WHERE activity_id = OLD.id;
END;


CREATE VIRTUAL TABLE IF NOT EXISTS evaluation_activities_fts USING fts5(
  activity_id UNINDEXED,
  evaluation_id UNINDEXED,
  project_id UNINDEXED,
  body,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS evaluation_activities_fts_insert
AFTER INSERT ON evaluation_activities BEGIN
  INSERT INTO evaluation_activities_fts(activity_id, evaluation_id, project_id, body)
  SELECT NEW.id, NEW.evaluation_id, evaluations.project_id, NEW.body
  FROM evaluations WHERE evaluations.id = NEW.evaluation_id;
END;

CREATE TRIGGER IF NOT EXISTS evaluation_activities_fts_update
AFTER UPDATE ON evaluation_activities BEGIN
  DELETE FROM evaluation_activities_fts WHERE activity_id = OLD.id;
  INSERT INTO evaluation_activities_fts(activity_id, evaluation_id, project_id, body)
  SELECT NEW.id, NEW.evaluation_id, evaluations.project_id, NEW.body
  FROM evaluations WHERE evaluations.id = NEW.evaluation_id;
END;

CREATE TRIGGER IF NOT EXISTS evaluation_activities_fts_delete
AFTER DELETE ON evaluation_activities BEGIN
  DELETE FROM evaluation_activities_fts WHERE activity_id = OLD.id;
END;


CREATE VIRTUAL TABLE IF NOT EXISTS task_activities_fts USING fts5(
  activity_id UNINDEXED,
  task_id UNINDEXED,
  project_id UNINDEXED,
  body,
  tokenize = 'porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS task_activities_fts_insert
AFTER INSERT ON task_activities BEGIN
  INSERT INTO task_activities_fts(activity_id, task_id, project_id, body)
  VALUES (NEW.id, NEW.task_id, NEW.project_id, NEW.body);
END;

CREATE TRIGGER IF NOT EXISTS task_activities_fts_update
AFTER UPDATE ON task_activities BEGIN
  DELETE FROM task_activities_fts WHERE activity_id = OLD.id;
  INSERT INTO task_activities_fts(activity_id, task_id, project_id, body)
  VALUES (NEW.id, NEW.task_id, NEW.project_id, NEW.body);
END;

CREATE TRIGGER IF NOT EXISTS task_activities_fts_delete
AFTER DELETE ON task_activities BEGIN
  DELETE FROM task_activities_fts WHERE activity_id = OLD.id;
END;
"""


# Backfill FTS tables for databases that already had source rows before the FTS
# triggers existed. Each pair is (fts_table, INSERT ... SELECT statement). The
# backfill is idempotent: it only runs when the FTS table is empty, so a fresh
# database (where triggers have already populated FTS as rows were inserted) is
# untouched.
_FTS_BACKFILLS: tuple[tuple[str, str], ...] = (
    (
        "analyses_fts",
        "INSERT INTO analyses_fts(analysis_id, project_id, title, summary, content) "
        "SELECT id, project_id, title, summary, content FROM analyses",
    ),
    (
        "hypotheses_fts",
        "INSERT INTO hypotheses_fts(hypothesis_id, project_id, title, summary) "
        "SELECT id, project_id, title, summary FROM hypotheses",
    ),
    (
        "experiments_fts",
        "INSERT INTO experiments_fts(experiment_id, project_id, title, summary) "
        "SELECT id, project_id, title, summary FROM experiments",
    ),
    (
        "baselines_fts",
        "INSERT INTO baselines_fts(baseline_id, project_id, title, summary) "
        "SELECT id, project_id, title, summary FROM baselines",
    ),
    (
        "evaluations_fts",
        "INSERT INTO evaluations_fts(evaluation_id, project_id, title, summary) "
        "SELECT id, project_id, title, summary FROM evaluations",
    ),
    (
        "measurements_fts",
        "INSERT INTO measurements_fts(measurement_id, project_id, evaluation_id, body) "
        "SELECT measurements.id, evaluations.project_id, measurements.evaluation_id, "
        "       measurements.body "
        "FROM measurements "
        "JOIN evaluations ON evaluations.id = measurements.evaluation_id",
    ),
    (
        "tasks_fts",
        "INSERT INTO tasks_fts(task_id, project_id, title, content) "
        "SELECT id, project_id, title, content FROM tasks",
    ),
    (
        "analysis_activities_fts",
        "INSERT INTO analysis_activities_fts(activity_id, analysis_id, project_id, body) "
        "SELECT analysis_activities.id, analysis_activities.analysis_id, "
        "       analyses.project_id, analysis_activities.body "
        "FROM analysis_activities "
        "JOIN analyses ON analyses.id = analysis_activities.analysis_id",
    ),
    (
        "hypothesis_activities_fts",
        "INSERT INTO hypothesis_activities_fts(activity_id, hypothesis_id, project_id, body) "
        "SELECT hypothesis_activities.id, hypothesis_activities.hypothesis_id, "
        "       hypotheses.project_id, hypothesis_activities.body "
        "FROM hypothesis_activities "
        "JOIN hypotheses ON hypotheses.id = hypothesis_activities.hypothesis_id",
    ),
    (
        "baseline_activities_fts",
        "INSERT INTO baseline_activities_fts(activity_id, baseline_id, project_id, body) "
        "SELECT baseline_activities.id, baseline_activities.baseline_id, "
        "       baselines.project_id, baseline_activities.body "
        "FROM baseline_activities "
        "JOIN baselines ON baselines.id = baseline_activities.baseline_id",
    ),
    (
        "experiment_activities_fts",
        "INSERT INTO experiment_activities_fts(activity_id, experiment_id, project_id, body) "
        "SELECT experiment_activities.id, experiment_activities.experiment_id, "
        "       experiments.project_id, experiment_activities.body "
        "FROM experiment_activities "
        "JOIN experiments ON experiments.id = experiment_activities.experiment_id",
    ),
    (
        "evaluation_activities_fts",
        "INSERT INTO evaluation_activities_fts(activity_id, evaluation_id, project_id, body) "
        "SELECT evaluation_activities.id, evaluation_activities.evaluation_id, "
        "       evaluations.project_id, evaluation_activities.body "
        "FROM evaluation_activities "
        "JOIN evaluations ON evaluations.id = evaluation_activities.evaluation_id",
    ),
    (
        "task_activities_fts",
        "INSERT INTO task_activities_fts(activity_id, task_id, project_id, body) "
        "SELECT id, task_id, project_id, body FROM task_activities",
    ),
)


async def _backfill_fts_tables(connection: aiosqlite.Connection) -> None:
    for fts_table, insert_sql in _FTS_BACKFILLS:
        cursor = await connection.execute(f"SELECT COUNT(*) FROM {fts_table}")
        row = await cursor.fetchone()
        await cursor.close()
        if row is not None and row[0] == 0:
            await connection.execute(insert_sql)


async def run_migrations(connection: aiosqlite.Connection) -> None:
    await connection.executescript(SCHEMA_SQL)
    await connection.executescript(COLLECTION_OUTBOX_SQL)
    await connection.executescript(FTS_SQL)
    await _backfill_fts_tables(connection)
    await connection.execute(f"PRAGMA user_version = {DATABASE_SCHEMA_VERSION}")
