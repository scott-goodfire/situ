import type { DurableStateLike } from "../../scorers/durable-state-scorer";

export type WorldStateOutput = Readonly<{
  state: DurableStateLike;
}>;

export type LiveExecOutput = Readonly<{
  command: Record<string, unknown>;
  state: DurableStateLike;
}>;
