import { configureWorkItems, resetWorkItemsContextForTests } from "./context";
import {
  claimDue,
  complete,
  countClaimed,
  enqueue,
  extendLease,
  failOrRetry,
  recoverExpiredLeases,
  workItemPayload,
} from "./operations";
import { workItemRepository } from "./repository";

/**
 * Single namespace object for work-item operations. Mirrors situ's
 * `jsonModule`, `textModule`, `dateTimeModule`, `computeModule`,
 * `worktreeModule` convention.
 */
export const workItemModule = {
  configure: configureWorkItems,
  resetForTests: resetWorkItemsContextForTests,
  repository: workItemRepository,
  enqueue,
  claimDue,
  countClaimed,
  complete,
  failOrRetry,
  extendLease,
  recoverExpiredLeases,
  payload: workItemPayload,
} as const;
