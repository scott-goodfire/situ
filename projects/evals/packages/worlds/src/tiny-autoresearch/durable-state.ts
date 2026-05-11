import { Database } from "bun:sqlite";

import { jsonModule } from "../modules/json";
import type { TinyAutoresearchWorld } from "./create-world";

export type DurableRow = Record<string, unknown>;

export type TinyAutoresearchDurableState = Readonly<{
  session: DurableRow | undefined;
  claudeAgents: DurableRow[];
  claudeAgentRuns: DurableRow[];
  claudeAgentEvents: DurableRow[];
  researchProjects: DurableRow[];
  researchProjectInteractions: DurableRow[];
  researchTasks: DurableRow[];
  researchTaskVerifications: DurableRow[];
  workItems: DurableRow[];
  hypotheses: DurableRow[];
  baselines: DurableRow[];
  experiments: DurableRow[];
  evaluations: DurableRow[];
  measurements: DurableRow[];
  artifacts: DurableRow[];
  entityLinks: DurableRow[];
  activities: DurableRow[];
  appEvents: DurableRow[];
}>;

export function readTinyAutoresearchDurableState({
  world,
}: {
  world: TinyAutoresearchWorld;
}): TinyAutoresearchDurableState {
  const sqlite = new Database(world.dbPath, { readonly: true });
  try {
    return {
      session: one({ sqlite, sql: "select * from session limit 1" }),
      claudeAgents: many({ sqlite, sql: "select * from claude_agents order by id" }),
      claudeAgentRuns: many({
        sqlite,
        sql: "select * from claude_agent_runs order by created_at, id",
      }),
      claudeAgentEvents: many({
        sqlite,
        sql: "select * from claude_agent_events order by created_at, id",
      }),
      researchProjects: many({
        sqlite,
        sql: "select * from research_projects order by created_at, id",
      }),
      researchProjectInteractions: many({
        sqlite,
        sql: "select * from research_project_interactions order by created_at, id",
      }),
      researchTasks: many({
        sqlite,
        sql: "select * from research_tasks order by created_at, id",
      }),
      researchTaskVerifications: many({
        sqlite,
        sql: "select * from research_task_verifications order by created_at, id",
      }),
      workItems: many({ sqlite, sql: "select * from work_items order by created_at, id" }),
      hypotheses: many({ sqlite, sql: "select * from hypotheses order by created_at, id" }),
      baselines: many({ sqlite, sql: "select * from baselines order by created_at, id" }),
      experiments: many({ sqlite, sql: "select * from experiments order by created_at, id" }),
      evaluations: many({ sqlite, sql: "select * from evaluations order by created_at, id" }),
      measurements: many({ sqlite, sql: "select * from measurements order by created_at, id" }),
      artifacts: many({ sqlite, sql: "select * from artifacts order by created_at, id" }),
      entityLinks: many({ sqlite, sql: "select * from entity_links order by created_at, id" }),
      activities: [
        ...activityRows({
          sqlite,
          table: "hypothesis_activities",
          entityColumn: "hypothesis_id",
        }),
        ...activityRows({
          sqlite,
          table: "experiment_activities",
          entityColumn: "experiment_id",
        }),
        ...activityRows({ sqlite, table: "baseline_activities", entityColumn: "baseline_id" }),
        ...activityRows({
          sqlite,
          table: "evaluation_activities",
          entityColumn: "evaluation_id",
        }),
      ],
      appEvents: many({ sqlite, sql: "select * from app_events order by created_at, id" }),
    };
  } finally {
    sqlite.close();
  }
}

export function durableStateText({ state }: { state: TinyAutoresearchDurableState }): string {
  return jsonModule.stringify({ value: state }).toLowerCase();
}

export function changedFilesFromState({
  state,
}: {
  state: TinyAutoresearchDurableState;
}): string[] {
  const changed = new Set<string>();
  const rows = [...state.researchTasks, ...state.activities, ...state.measurements];
  for (const row of rows) {
    const payload = objectRecord({ value: row.payload });
    if (!payload) {
      continue;
    }
    const files = payload.changedFiles;
    if (!Array.isArray(files)) {
      continue;
    }
    for (const file of files) {
      if (typeof file === "string") {
        changed.add(file);
      }
    }
  }
  return [...changed].sort();
}

function activityRows({
  sqlite,
  table,
  entityColumn,
}: {
  sqlite: Database;
  table: string;
  entityColumn: string;
}): DurableRow[] {
  return many({
    sqlite,
    sql: `select '${table}' as table_name, ${entityColumn} as entity_id, * from ${table} order by created_at, id`,
  });
}

function one({ sqlite, sql }: { sqlite: Database; sql: string }): DurableRow | undefined {
  const row = sqlite.query(sql).get() as DurableRow | undefined;
  return row ? parseJsonColumns({ row }) : undefined;
}

function many({ sqlite, sql }: { sqlite: Database; sql: string }): DurableRow[] {
  return (sqlite.query(sql).all() as DurableRow[]).map((row) => parseJsonColumns({ row }));
}

function parseJsonColumns({ row }: { row: DurableRow }): DurableRow {
  const parsed: DurableRow = { ...row };
  for (const [key, value] of Object.entries(row)) {
    if ((key === "payload_json" || key === "metadata_json") && typeof value === "string") {
      parsed[key.replace("_json", "")] = jsonModule.parse<unknown>({ text: value });
    }
  }
  return parsed;
}

function objectRecord({ value }: { value: unknown }): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}
