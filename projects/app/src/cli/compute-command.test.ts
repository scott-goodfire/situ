import { describe, expect, test } from "bun:test";

import { runComputeCommand } from "./compute-command";

describe("runComputeCommand", () => {
  test("requires an explicit session", async () => {
    await expect(runComputeCommand({ argv: ["list"] })).rejects.toThrow(
      "situ compute requires --session <session>.",
    );
  });

  test("rejects unknown compute subcommands", async () => {
    await expect(runComputeCommand({ argv: ["claim", "--session", "ses_test"] })).rejects.toThrow(
      "unknown compute command: claim",
    );
  });
});
