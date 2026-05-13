import { DateTime, type DurationLike } from "luxon";

export type IsoTimestamp = string;

export type NowIsoInput = {
  now?: DateTime;
};

export type AddDurationInput = {
  duration: DurationLike;
  timestamp: IsoTimestamp;
};

export type IsIsoAtOrBeforeInput = {
  left: IsoTimestamp;
  right: IsoTimestamp;
};

export type ToIsoTimestampInput = {
  dateTime: DateTime;
};

/** Converts a Luxon timestamp to the persistence ISO format. */
export const toIsoTimestamp = ({ dateTime }: ToIsoTimestampInput): IsoTimestamp => {
  const timestamp = dateTime.toUTC().toISO();

  if (timestamp !== null) {
    return timestamp;
  }

  return dateTime.toUTC().toJSDate().toISOString();
};

/** Returns the current UTC timestamp in the persistence ISO format. */
export const nowIso = ({ now = DateTime.utc() }: NowIsoInput = {}): IsoTimestamp =>
  toIsoTimestamp({ dateTime: now });

/** Adds a Luxon duration to an ISO timestamp. */
export const addDurationToIso = ({ duration, timestamp }: AddDurationInput): IsoTimestamp =>
  toIsoTimestamp({
    dateTime: DateTime.fromISO(timestamp, { zone: "utc" }).plus(duration),
  });

/** Compares two ISO timestamps using Luxon parsing. */
export const isIsoAtOrBefore = ({ left, right }: IsIsoAtOrBeforeInput): boolean =>
  DateTime.fromISO(left, { zone: "utc" }).toMillis() <=
  DateTime.fromISO(right, { zone: "utc" }).toMillis();
