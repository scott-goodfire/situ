import { expect, test } from "bun:test";

import { isBaseError, NotFoundError, toErrorDetails } from ".";

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

test("unknown errors become serializable details", () => {
  expect(
    toErrorDetails({
      value: new Error("plain failure"),
    }),
  ).toEqual({
    message: "plain failure",
    name: "Error",
  });
});
