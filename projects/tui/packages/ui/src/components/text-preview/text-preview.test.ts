import { describe, expect, test } from "bun:test";
import { previewText } from "./text-preview.js";

describe("previewText", () => {
  test("collapses multiline evidence into one line", () => {
    const preview = previewText({
      value: "Evidence:\n\n```text\nline one\nline two\n```",
    });

    expect(preview).toBe("Evidence: ```text line one line two ```");
  });

  test("truncates long evidence", () => {
    const preview = previewText({
      value: "A very long command output with enough content to hide.",
      maxCharacters: 24,
    });

    expect(preview).toBe("A very long command out…");
  });
});
