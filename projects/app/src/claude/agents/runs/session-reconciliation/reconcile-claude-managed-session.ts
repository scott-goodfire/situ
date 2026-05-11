import { eq } from "drizzle-orm";

import { getDb } from "../../../../data/db/client";
import { claudeAgents } from "../../../../data/db/schema";
import { hasAnthropicKey } from "../../../../secrets/local-secret-store";
import { applyClaudeSessionReconciliationAction } from "./apply-claude-session-reconciliation-action";
import { ClaudeSessionReconciliationActionKind } from "./claude-session-reconciliation-action";
import { resolveClaudeSessionReconciliationAction } from "./resolve-claude-session-reconciliation-action";
import { resolveStalledSessionAction } from "./resolve-stalled-session-action";

export async function reconcileClaudeManagedSession(): Promise<void> {
  if (!(await hasAnthropicKey())) {
    return;
  }

  const localSession = await getDb().query.session.findFirst();
  const claudeSessionId = localSession?.claudeSessionId;
  if (!claudeSessionId) {
    return;
  }

  const agent = await getDb().query.claudeAgents.findFirst({
    where: eq(claudeAgents.claudeSessionId, claudeSessionId),
  });
  if (agent) {
    const stalledAction = await resolveStalledSessionAction({
      agentId: agent.id,
      claudeSessionId,
    });
    if (stalledAction.kind !== ClaudeSessionReconciliationActionKind.None) {
      await applyClaudeSessionReconciliationAction({ action: stalledAction });
      return;
    }
  }

  const action = await resolveClaudeSessionReconciliationAction({ claudeSessionId });
  await applyClaudeSessionReconciliationAction({ action });
}
