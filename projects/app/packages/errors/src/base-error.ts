import type { ErrorKind } from "./kinds";

export type ErrorDetails = Record<string, unknown>;

export type BaseErrorInput = {
  cause?: unknown;
  details?: ErrorDetails;
  kind: ErrorKind;
  message: string;
};

/**
 * Base class for structured application errors.
 */
export class BaseError extends Error {
  readonly details?: ErrorDetails;
  readonly kind: ErrorKind;

  constructor(input: BaseErrorInput) {
    super(input.message, { cause: input.cause });

    this.name = this.constructor.name;
    this.kind = input.kind;
    this.details = input.details;
  }
}
