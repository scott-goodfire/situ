import { DateTime } from "luxon";

import type { Timestamp } from "../../domain/records";

function nowIso(): Timestamp {
  return requireIso(DateTime.utc());
}

function requireIso(dt: DateTime): Timestamp {
  const iso = dt.toISO();
  if (iso === null) {
    throw new Error("DateTime did not produce ISO string");
  }
  return iso;
}

function maxIso(timestamps: Timestamp[]): Timestamp {
  const validDts = collectIso(timestamps);
  const maxMs = maxMillis(validDts);
  return requireIso(DateTime.fromMillis(maxMs, { zone: "utc" }));
}

function collectIso(values: Array<Timestamp | undefined>): DateTime[] {
  return values
    .filter((value): value is Timestamp => typeof value === "string")
    .map((value) => DateTime.fromISO(value))
    .filter((dt) => dt.isValid);
}

function minMillis(dts: DateTime[]): number {
  return Math.min(...dts.map((dt) => dt.toMillis()));
}

function maxMillis(dts: DateTime[]): number {
  return Math.max(...dts.map((dt) => dt.toMillis()));
}

export const dateTimeModule = {
  nowIso,
  requireIso,
  maxIso,
  collectIso,
  minMillis,
  maxMillis,
} as const;
