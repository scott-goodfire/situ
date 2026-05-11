import { getDb } from "../../../../data/db/client";
import { hasAnthropicKey } from "../../../../secrets/local-secret-store";
import { applyClaudeSessionReconciliationAction } from "./apply-claude-session-reconciliation-action";
import { resolveClaudeSessionReconciliationAction } from "./resolve-claude-session-reconciliation-action";

export async function reconcileClaudeManagedSession(): Promise<void> {
  if (!(await hasAnthropicKey())) {
    return;
  }

  const localSession = await getDb().query.session.findFirst();
  const claudeSessionId = localSession?.claudeSessionId;
  if (!claudeSessionId) {
    return;
  }

  const action = await resolveClaudeSessionReconciliationAction({ claudeSessionId });
  await applyClaudeSessionReconciliationAction({ action });
}
