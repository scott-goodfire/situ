import { describe, expect, test } from "bun:test";

import { parseRootCommand } from "./root-command";

describe("parseRootCommand", () => {
  test("defaults to app mode with no args", () => {
    expect(parseRootCommand({ argv: [] })).toEqual({ kind: "app", argv: [] });
  });

  test("treats leading options as app options", () => {
    expect(parseRootCommand({ argv: ["--port", "5500"] })).toEqual({
      kind: "app",
      argv: ["--port", "5500"],
    });
  });

  test("parses app command explicitly", () => {
    expect(parseRootCommand({ argv: ["app", "--host", "127.0.0.1"] })).toEqual({
      kind: "app",
      argv: ["--host", "127.0.0.1"],
    });
  });

  test("parses registered root commands and strips the command name", () => {
    expect(parseRootCommand({ argv: ["compute", "list", "--json"] })).toEqual({
      kind: "compute",
      argv: ["list", "--json"],
    });
    expect(parseRootCommand({ argv: ["sessions", "--json"] })).toEqual({
      kind: "sessions",
      argv: ["--json"],
    });
    expect(parseRootCommand({ argv: ["skills", "sync"] })).toEqual({
      kind: "skills",
      argv: ["sync"],
    });
    expect(parseRootCommand({ argv: ["instructions"] })).toEqual({
      kind: "instructions",
      argv: [],
    });
    expect(parseRootCommand({ argv: ["skill", "install"] })).toEqual({
      kind: "skill",
      argv: ["install"],
    });
  });

  test("parses self update aliases", () => {
    expect(parseRootCommand({ argv: ["self-update", "v1.2.3"] })).toEqual({
      kind: "self-update",
      argv: ["v1.2.3"],
    });
    expect(parseRootCommand({ argv: ["self", "update", "v1.2.3"] })).toEqual({
      kind: "self-update",
      argv: ["v1.2.3"],
    });
  });

  test("parses version and help commands", () => {
    expect(parseRootCommand({ argv: ["version"] })).toEqual({ kind: "version" });
    expect(parseRootCommand({ argv: ["--version"] })).toEqual({ kind: "version" });
    expect(parseRootCommand({ argv: ["-v"] })).toEqual({ kind: "version" });
    expect(parseRootCommand({ argv: ["help"] })).toEqual({ kind: "help" });
    expect(parseRootCommand({ argv: ["--help"] })).toEqual({ kind: "help" });
    expect(parseRootCommand({ argv: ["-h"] })).toEqual({ kind: "help" });
  });

  test("rejects unknown root commands", () => {
    expect(() => parseRootCommand({ argv: ["wat"] })).toThrow("unknown command: wat");
  });
});
