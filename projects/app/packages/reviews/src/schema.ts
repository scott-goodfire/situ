import type { ActorKind, TargetKind } from "@situ/common";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { ReviewStatus } from "./types";

export const REVIEWS_TABLE = "reviews";

export const reviews = sqliteTable(REVIEWS_TABLE, {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  targetKind: text("target_kind").$type<TargetKind>().notNull(),
  targetId: text("target_id").notNull(),
  reviewerActorKind: text("reviewer_actor_kind").$type<ActorKind>().notNull(),
  reviewerActorId: text("reviewer_actor_id").notNull(),
  status: text("status").$type<ReviewStatus>().notNull(),
  rationaleMarkdown: text("rationale_markdown").notNull(),
  reviewedCommit: text("reviewed_commit"),
  citedMeasurementIdsJson: text("cited_measurement_ids_json").notNull(),
  citedArtifactIdsJson: text("cited_artifact_ids_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type ReviewRow = typeof reviews.$inferSelect;
export type NewReviewRow = typeof reviews.$inferInsert;
