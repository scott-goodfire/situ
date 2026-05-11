import { describe, expect, test } from "bun:test";

import { runComputeCommand } from "./compute-command";

describe("runComputeCommand", () => {
  test("requires an explicit session", async () => {
    await expect(runComputeCommand({ argv: ["list"] })).rejects.toThrow(
      "situ compute requires --session <session>.",
    );
  });

  test("rejects resume for compute commands", async () => {
    await expect(runComputeCommand({ argv: ["list", "--resume"] })).rejects.toThrow(
      "situ compute does not support --resume",
    );
  });
});
