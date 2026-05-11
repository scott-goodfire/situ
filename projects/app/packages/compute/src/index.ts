// Single barrel. Everything consumers need lives here.

// Schema + SQL fragment for the runtime migrator
export { computeTargets, COMPUTE_TARGETS_TABLE_SQL } from "./schema";

// Repository (raw CRUD on compute_targets)
export { computeTargetRepository } from "./repository";

// Module namespace — the main operations API
export { computeModule } from "./module";

// Constants
export { CUDA_VISIBLE_DEVICES_METADATA_KEY, DEFAULT_LOCAL_COMPUTE_POOL } from "./constants";

// Types
export type {
  ComputeTargetRecord,
  ComputeTargetStatus,
  ResearchTaskComputeClaim,
  ResearchTaskLike,
  WorkItemLike,
  ComputeBlocker,
  ComputeBlockerKind,
  ComputeBlockerResearchTaskRow,
  ComputeBlockerTargetRow,
  ComputeContext,
  RecordAppEvent,
} from "./types";

// Context bootstrapping (also reachable via computeModule.configure)
export { configureCompute, resetComputeContextForTests } from "./context";
