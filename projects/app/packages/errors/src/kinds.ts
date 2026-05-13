export const ERROR_KINDS = [
  "not_found",
  "invalid_argument",
  "precondition_failed",
  "conflict",
  "invariant_failed",
  "not_implemented",
] as const;

export type ErrorKind = (typeof ERROR_KINDS)[number];
