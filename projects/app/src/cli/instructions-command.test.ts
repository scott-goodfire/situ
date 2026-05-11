import { describe, expect, test } from "bun:test";

import { runInstructionsCommand } from "./instructions-command";

describe("runInstructionsCommand", () => {
  test("prints the skill body and returns 0", async () => {
    const chunks: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: unknown): boolean => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    try {
      const code = await runInstructionsCommand({ argv: [] });
      expect(code).toBe(0);
    } finally {
      process.stdout.write = originalWrite;
    }

    const output = chunks.join("");
    expect(output).toContain("Situ first-run setup");
    expect(output).toContain("situ --version");
    expect(output).toContain("SITU_ANTHROPIC_KEY");
    expect(output).toContain("~/.situ/secrets.json");
    expect(output).toContain("situ app");
    expect(output).toContain("situ events --follow");
  });

  test("prints help and returns 0 for --help", async () => {
    const lines: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.join(" "));
    };

    try {
      const code = await runInstructionsCommand({ argv: ["--help"] });
      expect(code).toBe(0);
    } finally {
      console.log = originalLog;
    }

    const output = lines.join("\n");
    expect(output).toContain("Usage: situ instructions");
    expect(output).not.toContain("Situ first-run setup");
  });
});
