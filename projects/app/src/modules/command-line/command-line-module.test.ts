import { describe, expect, test } from "bun:test";

import { commandLineModule } from ".";

describe("commandLineModule", () => {
  test("requires the value after a flag", () => {
    expect(
      commandLineModule.requireValue({ argv: ["--limit", "10"], index: 0, flag: "--limit" }),
    ).toBe("10");
  });

  test("throws when a flag value is missing or empty", () => {
    expect(() =>
      commandLineModule.requireValue({ argv: ["--limit"], index: 0, flag: "--limit" }),
    ).toThrow("--limit requires a value");
    expect(() =>
      commandLineModule.requireValue({ argv: ["--limit", ""], index: 0, flag: "--limit" }),
    ).toThrow("--limit requires a value");
  });

  test("parses positive integers", () => {
    expect(commandLineModule.positiveInteger({ value: "1", flag: "--limit" })).toBe(1);
    expect(commandLineModule.positiveInteger({ value: "42", flag: "--limit" })).toBe(42);
  });

  test("rejects invalid positive integers", () => {
    expect(() => commandLineModule.positiveInteger({ value: "0", flag: "--limit" })).toThrow(
      "invalid --limit value: 0",
    );
    expect(() => commandLineModule.positiveInteger({ value: "1.5", flag: "--limit" })).toThrow(
      "invalid --limit value: 1.5",
    );
  });

  test("parses TCP port numbers", () => {
    expect(commandLineModule.portNumber({ value: "0", flag: "--port" })).toBe(0);
    expect(commandLineModule.portNumber({ value: "65535", flag: "--port" })).toBe(65535);
  });

  test("rejects invalid TCP port numbers", () => {
    expect(() => commandLineModule.portNumber({ value: "-1", flag: "--port" })).toThrow(
      "invalid --port value: -1",
    );
    expect(() => commandLineModule.portNumber({ value: "65536", flag: "--port" })).toThrow(
      "invalid --port value: 65536",
    );
  });

  test("recognizes help flags", () => {
    expect(commandLineModule.isHelpFlag({ arg: "-h" })).toBe(true);
    expect(commandLineModule.isHelpFlag({ arg: "--help" })).toBe(true);
    expect(commandLineModule.isHelpFlag({ arg: "--json" })).toBe(false);
  });

  test("parses options with CAC", () => {
    const parsed = commandLineModule.parseOptions({
      argv: ["--json", "--session", "ses_123", "--limit", "10", "extra"],
      commandName: "example",
      options: [
        { rawName: "--json" },
        { rawName: "--session <session>" },
        { rawName: "--limit <limit>" },
      ],
    });

    expect(commandLineModule.booleanOption({ value: parsed.options.json })).toBe(true);
    expect(
      commandLineModule.optionalStringOption({
        value: parsed.options.session,
        flag: "--session",
      }),
    ).toBe("ses_123");
    expect(
      commandLineModule.optionalStringOption({
        value: parsed.options.limit,
        flag: "--limit",
      }),
    ).toBe("10");
    expect(parsed.positionals).toEqual(["extra"]);
  });

  test("rejects unknown CAC options", () => {
    expect(() =>
      commandLineModule.parseOptions({
        argv: ["--wat"],
        commandName: "example",
        options: [],
      }),
    ).toThrow("Unknown option `--wat`");
  });

  test("requires string option values", () => {
    expect(() =>
      commandLineModule.optionalStringOption({
        value: true,
        flag: "--session",
      }),
    ).toThrow("--session requires a value");
    expect(() =>
      commandLineModule.optionalStringOption({
        value: "",
        flag: "--session",
      }),
    ).toThrow("--session requires a value");
  });
});
