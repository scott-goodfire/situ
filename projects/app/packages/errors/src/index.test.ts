import { expect, test } from "bun:test";

import {
  BaseError,
  ConflictError,
  InvalidArgumentError,
  InvariantError,
  isBaseError,
  NotFoundError,
  NotImplementedError,
  PreconditionError,
  toErrorDetails,
} from ".";

test("structured errors expose stable kind and details", () => {
  const error = new NotFoundError({
    details: {
      id: "task_1",
      resource: "Task",
    },
    message: "Task not found: task_1",
  });

  expect(error.kind).toBe("not_found");
  expect(error.details).toEqual({
    id: "task_1",
    resource: "Task",
  });
  expect(isBaseError({ value: error })).toBe(true);
});

test("application error classes map to stable kinds", () => {
  const errors = [
    new NotFoundError({ message: "not found" }),
    new InvalidArgumentError({ message: "invalid" }),
    new PreconditionError({ message: "precondition" }),
    new ConflictError({ message: "conflict" }),
    new InvariantError({ message: "invariant" }),
    new NotImplementedError({ message: "not implemented" }),
  ];

  expect(errors.map((error) => error.kind)).toEqual([
    "not_found",
    "invalid_argument",
    "precondition_failed",
    "conflict",
    "invariant_failed",
    "not_implemented",
  ]);
  expect(errors.every((error) => error instanceof BaseError)).toBe(true);
});

test("unknown errors become serializable details", () => {
  expect(
    toErrorDetails({
      value: new InvalidArgumentError({
        details: {
          field: "title",
        },
        message: "Title is required",
      }),
    }),
  ).toEqual({
    details: {
      field: "title",
    },
    kind: "invalid_argument",
    message: "Title is required",
    name: "InvalidArgumentError",
  });
  expect(
    toErrorDetails({
      value: new Error("plain failure"),
    }),
  ).toEqual({
    message: "plain failure",
    name: "Error",
  });
  expect(
    toErrorDetails({
      value: {
        code: "plain-object",
      },
    }),
  ).toEqual({
    value: {
      code: "plain-object",
    },
  });
  expect(
    toErrorDetails({
      value: "plain string",
    }),
  ).toEqual({
    value: "plain string",
  });
});
