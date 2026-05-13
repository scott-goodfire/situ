import { BaseError, type ErrorDetails } from "./base-error";

export type ApplicationErrorInput = {
  cause?: unknown;
  details?: ErrorDetails;
  message: string;
};

/**
 * Error for a missing record or resource.
 */
export class NotFoundError extends BaseError {
  constructor(input: ApplicationErrorInput) {
    super({
      ...input,
      kind: "not_found",
    });
  }
}

/**
 * Error for malformed caller input.
 */
export class InvalidArgumentError extends BaseError {
  constructor(input: ApplicationErrorInput) {
    super({
      ...input,
      kind: "invalid_argument",
    });
  }
}

/**
 * Error for unmet preconditions.
 */
export class PreconditionError extends BaseError {
  constructor(input: ApplicationErrorInput) {
    super({
      ...input,
      kind: "precondition_failed",
    });
  }
}

/**
 * Error for conflicting state.
 */
export class ConflictError extends BaseError {
  constructor(input: ApplicationErrorInput) {
    super({
      ...input,
      kind: "conflict",
    });
  }
}

/**
 * Error for failed internal assumptions.
 */
export class InvariantError extends BaseError {
  constructor(input: ApplicationErrorInput) {
    super({
      ...input,
      kind: "invariant_failed",
    });
  }
}

/**
 * Error for unavailable behavior.
 */
export class NotImplementedError extends BaseError {
  constructor(input: ApplicationErrorInput) {
    super({
      ...input,
      kind: "not_implemented",
    });
  }
}
