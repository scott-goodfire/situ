import { describe, expect, test } from "bun:test";

import { PreconditionError } from "./precondition-error";

describe("PreconditionError", () => {
  test("captures code, hint, and details", () => {
    const error = new PreconditionError({
      code: "thing_not_found",
      hint: "Look it up first.",
      details: { id: "abc" },
    });
    expect(error.code).toBe("thing_not_found");
    expect(error.hint).toBe("Look it up first.");
    expect(error.details).toEqual({ id: "abc" });
  });

  test("name is 'PreconditionError' so duck-type checks work across class identities", () => {
    const error = new PreconditionError({ code: "x", hint: "y" });
    expect(error.name).toBe("PreconditionError");
    expect(error).toBeInstanceOf(Error);
  });

  test("message embeds code and hint for log readability", () => {
    const error = new PreconditionError({ code: "x", hint: "fix it" });
    expect(error.message).toBe("[x] fix it");
  });
});
