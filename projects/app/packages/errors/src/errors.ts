import { BaseError, type ErrorDetails } from "./base-error";

export type ApplicationErrorInput = {
  cause?: unknown;
  details?: ErrorDetails;
  message: string;
};

/** Error for a requested record or resource that does not exist. */
export class NotFoundError extends BaseError {
  constructor(input: ApplicationErrorInput) {
    super({
      ...input,
      kind: "not_found",
    });
  }
}

/** Error for malformed or unsupported caller input. */
export class InvalidArgumentError extends BaseError {
  constructor(input: ApplicationErrorInput) {
    super({
      ...input,
      kind: "invalid_argument",
    });
  }
}

/** Error for a valid request that cannot run in the current state. */
export class PreconditionError extends BaseError {
  constructor(input: ApplicationErrorInput) {
    super({
      ...input,
      kind: "precondition_failed",
    });
  }
}

/** Error for concurrent or duplicate state that conflicts with the request. */
export class ConflictError extends BaseError {
  constructor(input: ApplicationErrorInput) {
    super({
      ...input,
      kind: "conflict",
    });
  }
}

/** Error for internal assumptions that should always hold. */
export class InvariantError extends BaseError {
  constructor(input: ApplicationErrorInput) {
    super({
      ...input,
      kind: "invariant_failed",
    });
  }
}

/** Error for accepted surfaces that have not been implemented yet. */
export class NotImplementedError extends BaseError {
  constructor(input: ApplicationErrorInput) {
    super({
      ...input,
      kind: "not_implemented",
    });
  }
}
