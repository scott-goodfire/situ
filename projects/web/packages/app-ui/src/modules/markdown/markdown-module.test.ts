import { describe, expect, it } from "vitest";
import { markdownModule } from "./markdown-module";

describe("markdownModule.strip", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(markdownModule.strip(null)).toBe("");
    expect(markdownModule.strip(undefined)).toBe("");
    expect(markdownModule.strip("")).toBe("");
  });

  it("strips fenced code blocks", () => {
    const input = "before\n```ts\nconst x = 1;\n```\nafter";
    expect(markdownModule.strip(input)).toBe("before after");
  });

  it("unwraps inline code while keeping the contents", () => {
    expect(markdownModule.strip("call `runSyncedWrite` here")).toBe("call runSyncedWrite here");
  });

  it("removes images entirely", () => {
    expect(markdownModule.strip("look ![alt text](image.png) here")).toBe("look here");
  });

  it("keeps link text and drops the URL", () => {
    expect(markdownModule.strip("see [the docs](https://example.com)")).toBe("see the docs");
  });

  it("strips heading markers", () => {
    expect(markdownModule.strip("# Title\n## Subtitle\n### Section")).toBe(
      "Title Subtitle Section",
    );
  });

  it("strips list markers (unordered and ordered)", () => {
    expect(markdownModule.strip("- one\n- two\n+ three\n* four")).toBe("one two three four");
    expect(markdownModule.strip("1. first\n2. second\n10. tenth")).toBe("first second tenth");
  });

  it("strips blockquote markers", () => {
    expect(markdownModule.strip("> quoted line\n> another")).toBe("quoted line another");
  });

  it("strips bold, italic, and strikethrough emphasis", () => {
    expect(markdownModule.strip("**bold** and *italic*")).toBe("bold and italic");
    expect(markdownModule.strip("__bold__ and _italic_")).toBe("bold and italic");
    expect(markdownModule.strip("~~struck~~ through")).toBe("struck through");
    expect(markdownModule.strip("***all three***")).toBe("all three");
  });

  it("collapses whitespace and trims", () => {
    expect(markdownModule.strip("  many   spaces\n\nand   newlines  ")).toBe(
      "many spaces and newlines",
    );
  });

  it("truncates with an ellipsis when over maxLength", () => {
    const long = "abcdefghijklmnop";
    expect(markdownModule.strip(long, { maxLength: 8 })).toBe("abcdefgh…");
  });

  it("does not append an ellipsis when under maxLength", () => {
    expect(markdownModule.strip("short", { maxLength: 200 })).toBe("short");
  });

  it("trims trailing whitespace before the ellipsis", () => {
    expect(markdownModule.strip("hello world there", { maxLength: 6 })).toBe("hello…");
  });

  it("composes multiple markdown features in one pass", () => {
    const input = [
      "# Heading",
      "",
      "Some **bold** and `inline` text with [a link](https://x.test).",
      "",
      "- bullet one",
      "- bullet two",
      "",
      "```js",
      "ignored = true;",
      "```",
    ].join("\n");
    expect(markdownModule.strip(input)).toBe(
      "Heading Some bold and inline text with a link. bullet one bullet two",
    );
  });
});
