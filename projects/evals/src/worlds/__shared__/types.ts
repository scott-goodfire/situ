import type { DurableStateLike } from "../../scorers/durable-state-scorer";

export type LiveExecOutput = Readonly<{
  command: Record<string, unknown>;
  state: DurableStateLike;
}>;
