import { blockersForPlannedResearchTasks } from "./blockers";
import { configureCompute, resetComputeContextForTests } from "./context";
import {
  claimForResearchTask,
  emptyStatusCounts,
  ensureDefaultLocalTargets,
  envForWorkItem,
  heartbeatLeaseForWorkItem,
  liveTargetCount,
  poolForResearchTask,
  releaseForWorkItem,
  releaseTarget,
} from "./operations";
import { computeTargetRepository } from "./repository";

/**
 * Single namespace object for compute operations. Mirrors situ's
 * `jsonModule`, `textModule`, `dateTimeModule` convention.
 *
 * The raw `computeTargetRepository` is still exported on its own from the
 * package barrel for code that wants CRUD on the table without going through
 * the operation layer; this module is the "high-level" surface that emits
 * app events, applies lease durations, and reads work-item payloads.
 */
export const computeModule = {
  configure: configureCompute,
  resetForTests: resetComputeContextForTests,
  targetRepository: computeTargetRepository,
  blockersForPlannedResearchTasks,
  claimForResearchTask,
  emptyStatusCounts,
  ensureDefaultLocalTargets,
  envForWorkItem,
  heartbeatLeaseForWorkItem,
  liveTargetCount,
  poolForResearchTask,
  releaseForWorkItem,
  releaseTarget,
} as const;
