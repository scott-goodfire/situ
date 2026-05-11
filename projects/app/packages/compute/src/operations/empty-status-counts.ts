import type { ComputeTargetStatus } from "../types";

export function emptyStatusCounts(): Record<ComputeTargetStatus, number> {
  return {
    idle: 0,
    claimed: 0,
    draining: 0,
    dead: 0,
  };
}
