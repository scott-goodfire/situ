// Single barrel. Everything consumers need lives here.

export { worktreeModule } from "./module";

export { PreconditionError } from "@situ/common";
export { safePathSegment } from "./__shared__/safe-path-segment";
export { clampNumber } from "./__shared__/clamp-number";

export type { CaptureCandidateResult, CommandResult } from "./types";
