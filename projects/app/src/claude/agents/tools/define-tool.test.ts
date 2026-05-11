import { describe, expect, test } from "bun:test";
import { z } from "zod";

import { PreconditionError } from "../../../data/repositories/__shared__";
import type { ClaudeAgentToolContext } from "./types";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";

const stubContext = {
  agentId: "agent_test",
  claudeAgentRunId: "run_test",
  workItem: { id: "wi_test" },
  activeResearchTaskId: undefined,
} as unknown as ClaudeAgentToolContext;

describe("defineTool", () => {
  describe("legacy (non-envelope) handler", () => {
    const tool = defineTool({
      name: "test_legacy_tool",
      description: "legacy test tool",
      roles: ["scientist"],
      inputSchema: z.object({
        name: z.string({ error: "name is required: provide a non-empty string." }).min(1),
      }),
      handler: async ({ input }) => {
        if (input.name === "throw_precondition") {
          throw new PreconditionError({
            code: "test_precondition_failed",
            hint: "do the precondition step first",
            details: { what: "missing thing" },
          });
        }
        if (input.name === "throw_unknown") {
          throw new Error("boom");
        }
        return { echoed: input.name };
      },
    });

    test("returns raw handler output on success", async () => {
      const result = await tool.handler({ input: { name: "hello" }, context: stubContext });
      expect(JSON.parse(result.content)).toEqual({ echoed: "hello" });
    });

    test("returns invalid_input envelope on Zod failure (omitted field)", async () => {
      const result = await tool.handler({ input: {}, context: stubContext });
      const parsed = JSON.parse(result.content) as Record<string, unknown>;
      expect(parsed).toMatchObject({
        ok: false,
        code: "invalid_input",
      });
      expect(parsed.hint).toBeTypeOf("string");
      const details = parsed.details as { issues: Array<{ path: string[]; message: string }> };
      expect(details.issues[0].path).toEqual(["name"]);
      expect(details.issues[0].message).toContain("name is required");
    });

    test("propagates PreconditionError so guardrail tools fail loud", async () => {
      await expect(
        tool.handler({ input: { name: "throw_precondition" }, context: stubContext }),
      ).rejects.toThrow(PreconditionError);
    });

    test("propagates unknown errors so situ bugs surface", async () => {
      await expect(
        tool.handler({ input: { name: "throw_unknown" }, context: stubContext }),
      ).rejects.toThrow("boom");
    });
  });

  describe("envelope handler", () => {
    const tool = defineTool({
      name: "test_envelope_tool",
      description: "envelope test tool",
      roles: ["scientist"],
      inputSchema: z.object({
        name: z.string().min(1),
      }),
      resultEnvelope: true,
      handler: async ({ input }) => Result.ok({ echoed: input.name }),
    });

    test("wraps success in ok envelope", async () => {
      const result = await tool.handler({ input: { name: "hi" }, context: stubContext });
      expect(JSON.parse(result.content)).toEqual({ ok: true, data: { echoed: "hi" } });
    });

    test("returns invalid_input envelope on Zod failure", async () => {
      const result = await tool.handler({ input: {}, context: stubContext });
      expect(JSON.parse(result.content)).toMatchObject({ ok: false, code: "invalid_input" });
    });
  });
});
