import { Database } from "bun:sqlite";

import type {
  TinyAutoresearchActivitySeed,
  TinyAutoresearchSeedRecords,
} from "@situ/evals-fixtures/tiny-autoresearch";

import { dateTimeModule } from "../modules/date-time";
import { jsonModule } from "../modules/json";
import type { TinyAutoresearchWorld } from "./create-world";

export function seedTinyAutoresearchDb({
  world,
  seed,
}: {
  world: TinyAutoresearchWorld;
  seed: TinyAutoresearchSeedRecords;
}): void {
  const sqlite = new Database(world.dbPath);
  sqlite.exec("PRAGMA foreign_keys = ON;");
  const now = dateTimeModule.nowIso();
  const insert = sqlite.transaction(() => {
    sqlite
      .prepare(
        `
        INSERT OR REPLACE INTO session (
          id, title, objective, repo_path, workspace_key,
          status, sync_version, sync_deleted, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'active', 1, 0, ?, ?)
      `,
      )
      .run(
        world.sessionId,
        "Tiny Autoresearch Fixture",
        "Compare narrow training variants without changing the evaluation surface.",
        world.workspacePath,
        world.workspaceKey,
        now,
        now,
      );

    for (const agent of seed.claudeAgents) {
      sqlite
        .prepare(
          `
          INSERT OR REPLACE INTO claude_agents (
            id, kind, display_name, status, sync_version, sync_deleted, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, 1, 0, ?, ?)
        `,
        )
        .run(agent.id, agent.kind, agent.displayName, agent.status, now, now);
    }

    for (const project of seed.researchProjects) {
      sqlite
        .prepare(
          `
          INSERT OR REPLACE INTO research_projects (
            id, goal, phase, status, baseline_summary, result_summary, created_by_agent_id,
            payload_json, sync_version, sync_deleted, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
        `,
        )
        .run(
          project.id,
          project.goal,
          project.phase,
          project.status,
          project.baselineSummary,
          project.resultSummary,
          project.createdByAgentId,
          jsonModule.stringify({ value: project.payload }),
          now,
          now,
        );
    }

    for (const task of seed.researchTasks) {
      sqlite
        .prepare(
          `
          INSERT OR REPLACE INTO research_tasks (
            id, research_project_id, parent_research_task_id, type, status, priority,
            title, worker_prompt, verification_prompt, result_summary, target_kind, target_id,
            created_by_agent_id, payload_json, sync_version, sync_deleted, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
        `,
        )
        .run(
          task.id,
          task.researchProjectId,
          task.parentResearchTaskId,
          task.type,
          task.status,
          task.priority,
          task.title,
          task.workerPrompt,
          task.verificationPrompt,
          task.resultSummary,
          task.targetKind,
          task.targetId,
          task.createdByAgentId,
          jsonModule.stringify({ value: task.payload }),
          now,
          now,
        );
    }

    for (const record of seed.hypotheses) {
      sqlite
        .prepare(
          `
          INSERT OR REPLACE INTO hypotheses (
            id, created_by_research_task_id, created_by_agent_id, title, summary, status,
            sync_version, sync_deleted, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
        `,
        )
        .run(
          record.id,
          record.createdByResearchTaskId,
          record.createdByAgentId,
          record.title,
          record.summary,
          record.status,
          now,
          now,
        );
    }

    for (const record of seed.baselines) {
      sqlite
        .prepare(
          `
          INSERT OR REPLACE INTO baselines (
            id, created_by_research_task_id, created_by_agent_id, title, summary, status,
            sync_version, sync_deleted, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
        `,
        )
        .run(
          record.id,
          record.createdByResearchTaskId,
          record.createdByAgentId,
          record.title,
          record.summary,
          record.status,
          now,
          now,
        );
    }

    for (const record of seed.experiments) {
      sqlite
        .prepare(
          `
          INSERT OR REPLACE INTO experiments (
            id, created_by_research_task_id, created_by_agent_id, associated_hypothesis_id,
            parent_experiment_id, title, summary, status, worktree_path, base_commit,
            candidate_commit, sync_version, sync_deleted, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
        `,
        )
        .run(
          record.id,
          record.createdByResearchTaskId,
          record.createdByAgentId,
          record.associatedHypothesisId,
          record.parentExperimentId,
          record.title,
          record.summary,
          record.status,
          record.worktreePath,
          record.baseCommit,
          record.candidateCommit,
          now,
          now,
        );
    }

    for (const record of seed.evaluations) {
      sqlite
        .prepare(
          `
          INSERT OR REPLACE INTO evaluations (
            id, created_by_research_task_id, created_by_agent_id, title, summary, status,
            associated_baseline_id, associated_experiment_id, sync_version, sync_deleted,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
        `,
        )
        .run(
          record.id,
          record.createdByResearchTaskId,
          record.createdByAgentId,
          record.title,
          record.summary,
          record.status,
          record.associatedBaselineId,
          record.associatedExperimentId,
          now,
          now,
        );
    }

    for (const measurement of seed.measurements) {
      sqlite
        .prepare(
          `
          INSERT OR REPLACE INTO measurements (
            id, created_by_research_task_id, created_by_agent_id, evaluation_id, actor, body,
            payload_json, sync_version, sync_deleted, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
        `,
        )
        .run(
          measurement.id,
          measurement.createdByResearchTaskId,
          measurement.createdByAgentId,
          measurement.evaluationId,
          measurement.actor,
          measurement.body,
          jsonModule.stringify({ value: measurement.payload }),
          now,
        );
    }

    for (const artifact of seed.artifacts) {
      sqlite
        .prepare(
          `
          INSERT OR REPLACE INTO artifacts (
            id, created_by_research_task_id, created_by_agent_id, entity_kind, entity_id, kind, title,
            path, media_type, size_bytes, sync_version, sync_deleted, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
        `,
        )
        .run(
          artifact.id,
          artifact.createdByResearchTaskId,
          artifact.createdByAgentId,
          artifact.entityKind,
          artifact.entityId,
          artifact.kind,
          artifact.title,
          artifact.path,
          artifact.mediaType,
          artifact.sizeBytes,
          now,
        );
    }

    for (const link of seed.entityLinks) {
      sqlite
        .prepare(
          `
          INSERT OR REPLACE INTO entity_links (
            id, from_kind, from_id, to_kind, to_id, relationship,
            sync_version, sync_deleted, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)
        `,
        )
        .run(link.id, link.fromKind, link.fromId, link.toKind, link.toId, link.relationship, now);
    }

    for (const activity of seed.activities) {
      insertActivity({ sqlite, activity, now });
    }

    for (const event of seed.appEvents) {
      sqlite
        .prepare(
          `
          INSERT INTO app_events (
            type, message, payload_json, sync_version, sync_deleted, created_at
          )
          VALUES (?, ?, ?, 1, 0, ?)
        `,
        )
        .run(event.type, event.message, jsonModule.stringify({ value: event.payload }), now);
    }
  });

  try {
    insert();
  } finally {
    sqlite.close();
  }
}

function insertActivity({
  sqlite,
  activity,
  now,
}: {
  sqlite: Database;
  activity: TinyAutoresearchActivitySeed;
  now: string;
}): void {
  const entityColumn = activityEntityColumn({ table: activity.table });
  sqlite
    .prepare(
      `
      INSERT INTO ${activity.table} (
        ${entityColumn}, actor_agent_id, actor, kind, body, payload_json,
        sync_version, sync_deleted, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)
    `,
    )
    .run(
      activity.entityId,
      activity.actorAgentId,
      activity.actor,
      activity.kind,
      activity.body,
      jsonModule.stringify({ value: activity.payload }),
      now,
    );
}

function activityEntityColumn({ table }: { table: TinyAutoresearchActivitySeed["table"] }): string {
  if (table === "hypothesis_activities") return "hypothesis_id";
  if (table === "experiment_activities") return "experiment_id";
  if (table === "baseline_activities") return "baseline_id";
  return "evaluation_id";
}
