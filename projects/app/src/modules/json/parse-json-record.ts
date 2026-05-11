import { jsonRecord } from "./json-record";

export function parseJsonRecord({ raw }: { raw: string }): Record<string, unknown> {
  try {
    return jsonRecord({ value: JSON.parse(raw) as unknown });
  } catch {
    return {};
  }
}
