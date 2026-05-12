export { enqueueClaudeAgentWork } from "./enqueue-turn";
export { executeClaudeAgentTurn } from "./execute-turn";
export {
  managerResearchProjectPrompt,
  scientistResearchTaskPrompt,
  verifierResearchTaskPrompt,
  VERIFIER_LINEAGE_NOISE_FLOOR_DEPTH,
} from "./prompts";
export type { VerifierLineageAncestor } from "./prompts";
export { reconcileClaudeManagedSession } from "./reconcile-session";
