import { DateTime } from "luxon";

export function nowIso(): string {
  return DateTime.utc().toISO();
}
