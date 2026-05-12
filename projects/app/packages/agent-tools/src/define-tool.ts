import { PreconditionError } from "@situ/common";
import { z } from "zod";

import { Result, type ToolResult } from "./result";
import type { AgentToolDefinition } from "./types";

type LegacyHandler<Context, Schema extends z.ZodTypeAny> = (input: {
  input: z.infer<Schema>;
  context: Context;
}) => Promise<unknown>;

type EnvelopeHandler<Context, Schema extends z.ZodTypeAny, T> = (input: {
  input: z.infer<Schema>;
  context: Context;
}) => Promise<ToolResult<T>>;

type LegacyToolConfig<Role extends string, Context, Schema extends z.ZodTypeAny> = {
  name: string;
  description: string;
  roles: readonly Role[];
  inputSchema: Schema;
  handler: LegacyHandler<Context, Schema>;
  resultEnvelope?: false;
};

type EnvelopeToolConfig<Role extends string, Context, Schema extends z.ZodTypeAny, T> = {
  name: string;
  description: string;
  roles: readonly Role[];
  inputSchema: Schema;
  handler: EnvelopeHandler<Context, Schema, T>;
  resultEnvelope: true;
};

export type DefineTool<Role extends string, Context> = {
  <Schema extends z.ZodTypeAny>(
    config: LegacyToolConfig<Role, Context, Schema>,
  ): AgentToolDefinition<Role, Context>;
  <Schema extends z.ZodTypeAny, T>(
    config: EnvelopeToolConfig<Role, Context, Schema, T>,
  ): AgentToolDefinition<Role, Context>;
};

export function createDefineTool<Role extends string, Context>(): DefineTool<Role, Context> {
  function defineTool<Schema extends z.ZodTypeAny, T>(
    config: LegacyToolConfig<Role, Context, Schema> | EnvelopeToolConfig<Role, Context, Schema, T>,
  ): AgentToolDefinition<Role, Context> {
    const { name, description, roles, inputSchema, resultEnvelope } = config;

    return {
      type: "custom",
      name,
      description,
      roles,
      input_schema: toClaudeInputSchema({ schema: inputSchema }),
      handler: async ({ input, context }) => {
        let parsed: z.infer<Schema>;
        try {
          parsed = inputSchema.parse(input ?? {}) as z.infer<Schema>;
        } catch (error) {
          if (error instanceof z.ZodError) {
            return wrap(
              Result.fail({
                code: "invalid_input",
                hint: "Fix the input shape based on details and retry.",
                details: { issues: error.issues },
              }),
            );
          }
          throw error;
        }
        if (resultEnvelope === true) {
          return runEnvelopeHandler({
            handler: config.handler as EnvelopeHandler<Context, Schema, T>,
            input: parsed,
            context,
            toolName: name,
          });
        }
        const value = await (config.handler as LegacyHandler<Context, Schema>)({
          input: parsed,
          context,
        });
        return { content: JSON.stringify(value, null, 2) };
      },
    };
  }
  return defineTool as DefineTool<Role, Context>;
}

async function runEnvelopeHandler<Context, Schema extends z.ZodTypeAny, T>({
  handler,
  input,
  context,
  toolName,
}: {
  handler: EnvelopeHandler<Context, Schema, T>;
  input: z.infer<Schema>;
  context: Context;
  toolName: string;
}): Promise<{ content: string }> {
  try {
    const result = await handler({ input, context });
    return wrap(result);
  } catch (error) {
    if (error instanceof PreconditionError) {
      return wrap(
        Result.fail({
          code: error.code,
          hint: error.hint,
          details: error.details,
        }),
      );
    }
    return wrap(
      Result.fail({
        code: "internal_error",
        hint: "This is likely a situ bug. Report the failure to the user and pause.",
        details: {
          tool: toolName,
          message: error instanceof Error ? error.message : String(error),
        },
      }),
    );
  }
}

function wrap(result: ToolResult<unknown>): { content: string } {
  return { content: JSON.stringify(result, null, 2) };
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
