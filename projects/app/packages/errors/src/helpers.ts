import isPlainObject from "lodash/isPlainObject";

import { BaseError, type ErrorDetails } from "./base-error";

export type IsBaseErrorInput = {
  value: unknown;
};

export type ToErrorDetailsInput = {
  value: unknown;
};

export type StructuredErrorInput = {
  value: BaseError;
};

/** Returns true when a value is a structured Situ application error. */
export const isBaseError = (input: IsBaseErrorInput): input is StructuredErrorInput =>
  input.value instanceof BaseError;

/** Converts unknown thrown values into small serializable details. */
export const toErrorDetails = (input: ToErrorDetailsInput): ErrorDetails => {
  if (isBaseError(input)) {
    const error = input.value;

    return {
      details: error.details,
      kind: error.kind,
      message: error.message,
      name: error.name,
    };
  }

  const value = input.value;

  if (value instanceof Error) {
    return {
      message: value.message,
      name: value.name,
    };
  }

  if (isPlainObject(value)) {
    return {
      value,
    };
  }

  return {
    value: String(value),
  };
};
