import type { Timestamp } from "../../timestamp";

function compareAscending(left: Timestamp, right: Timestamp): number {
  return left.localeCompare(right);
}

function compareDescending(left: Timestamp, right: Timestamp): number {
  return right.localeCompare(left);
}

function isTimestamp(value: unknown): value is Timestamp {
  return typeof value === "string" && value.trim().length > 0;
}

export const timestampModule = {
  compareAscending,
  compareDescending,
  isTimestamp,
} as const;
