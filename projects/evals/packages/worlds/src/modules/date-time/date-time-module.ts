import { DateTime } from "luxon";

function nowIso(): string {
  return DateTime.utc().toISO() ?? new Date().toISOString();
}

export const dateTimeModule = {
  nowIso,
} as const;
