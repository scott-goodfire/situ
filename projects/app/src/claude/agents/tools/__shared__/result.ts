export type ToolSuccess<T = unknown> = { ok: true; data: T };

export type ToolFailure = {
  ok: false;
  code: string;
  hint: string;
  details?: Record<string, unknown>;
};

export type ToolResult<T = unknown> = ToolSuccess<T> | ToolFailure;

export const Result = {
  ok<T>(data: T): ToolSuccess<T> {
    return { ok: true, data };
  },
  fail(args: { code: string; hint: string; details?: Record<string, unknown> }): ToolFailure {
    return { ok: false, ...args };
  },
};
