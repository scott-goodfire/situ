import { describe, expect, test } from "bun:test";

import { requiredText } from "./required-text";

describe("requiredText", () => {
  test("returns the trimmed value when non-empty", () => {
    expect(requiredText({ value: "  hello  ", label: "name" })).toBe("hello");
  });

  test("throws when blank or whitespace-only", () => {
    expect(() => requiredText({ value: "", label: "name" })).toThrow("name is required");
    expect(() => requiredText({ value: "   ", label: "name" })).toThrow("name is required");
  });

  test("includes the label in the error message", () => {
    expect(() => requiredText({ value: "", label: "researchProjectId" })).toThrow(
      "researchProjectId is required",
    );
  });
});
