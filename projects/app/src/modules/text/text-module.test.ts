import { describe, expect, test } from "bun:test";

import { textModule } from ".";

describe("textModule", () => {
  test("trims required text", () => {
    expect(textModule.requiredText({ value: "  hello  ", label: "name" })).toBe("hello");
  });

  test("rejects blank required text", () => {
    expect(() => textModule.requiredText({ value: "  \n\t  ", label: "name" })).toThrow(
      "name is required",
    );
  });

  test("reads optional record text", () => {
    expect(textModule.optionalRecordText({ record: { name: "  hello  " }, key: "name" })).toBe(
      "hello",
    );
    expect(textModule.optionalRecordText({ record: { name: "  " }, key: "name" })).toBeUndefined();
    expect(textModule.optionalRecordText({ record: { name: 42 }, key: "name" })).toBeUndefined();
  });

  test("reads required record text", () => {
    expect(textModule.requiredRecordText({ record: { name: "  hello  " }, key: "name" })).toBe(
      "hello",
    );
    expect(() => textModule.requiredRecordText({ record: { name: "  " }, key: "name" })).toThrow(
      "name is required",
    );
  });
});
