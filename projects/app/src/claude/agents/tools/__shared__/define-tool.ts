import { z } from "zod";

import type { ClaudeAgentRole } from "../../roles";
import type { ClaudeAgentToolContext, ClaudeAgentToolDefinition } from "../types";

type ToolHandler<Schema extends z.ZodTypeAny> = (input: {
  input: z.infer<Schema>;
  context: ClaudeAgentToolContext;
}) => Promise<unknown>;

export function defineTool<Schema extends z.ZodTypeAny>({
  name,
  description,
  roles,
  inputSchema,
  handler,
}: {
  name: string;
  description: string;
  roles: readonly ClaudeAgentRole[];
  inputSchema: Schema;
  handler: ToolHandler<Schema>;
}): ClaudeAgentToolDefinition {
  return {
    type: "custom",
    name,
    description,
    roles,
    input_schema: toClaudeInputSchema({ schema: inputSchema }),
    handler: async ({ input, context }) => {
      const parsed = inputSchema.parse(input ?? {}) as z.infer<Schema>;
      const value = await handler({ input: parsed, context });
      return { content: JSON.stringify(value, null, 2) };
    },
  };
}

function toClaudeInputSchema({ schema }: { schema: z.ZodTypeAny }): {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
} {
  const json = z.toJSONSchema(schema) as {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
  return {
    type: "object",
    properties: json.properties ?? {},
    required: json.required ?? [],
  };
}
