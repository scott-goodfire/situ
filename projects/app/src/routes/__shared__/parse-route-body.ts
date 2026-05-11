import type { Context } from "hono";
import type { z } from "zod";

export type ParseRouteBodyResult<T> = { ok: true; value: T } | { ok: false; response: Response };

export async function parseRouteBody<Schema extends z.ZodTypeAny>({
  context,
  schema,
}: {
  context: Context;
  schema: Schema;
}): Promise<ParseRouteBodyResult<z.infer<Schema>>> {
  let raw: unknown;
  try {
    raw = await context.req.json();
  } catch {
    return { ok: false, response: context.json({ error: "Invalid JSON body." }, 400) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: context.json({ error: firstZodIssueMessage({ error: result.error }) }, 400),
    };
  }
  return { ok: true, value: result.data as z.infer<Schema> };
}

function firstZodIssueMessage({ error }: { error: z.ZodError }): string {
  const issue = error.issues[0];
  if (!issue) {
    return "Invalid request body.";
  }
  const path = issue.path.length ? issue.path.join(".") : "body";
  return `${path}: ${issue.message}`;
}
