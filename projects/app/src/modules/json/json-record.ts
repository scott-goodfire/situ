import { z } from "zod";

const recordSchema = z.record(z.string(), z.unknown());

export function jsonRecord({ value }: { value: unknown }): Record<string, unknown> {
  const result = recordSchema.safeParse(value);
  return result.success ? result.data : {};
}
