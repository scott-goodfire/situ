import { getAnthropicClient } from "../../anthropic-client";
import {
  claudeSessionReconciliationAction,
  claudeSessionRetrieveErrorAction,
  type ClaudeSessionReconciliationAction,
} from "./claude-session-reconciliation-action";

export async function resolveClaudeSessionReconciliationAction({
  claudeSessionId,
}: {
  claudeSessionId: string;
}): Promise<ClaudeSessionReconciliationAction> {
  try {
    const client = await getAnthropicClient();
    const claudeSession = await client.beta.sessions.retrieve(claudeSessionId);
    return claudeSessionReconciliationAction({
      claudeSessionId,
      status: String(claudeSession.status),
    });
  } catch (error) {
    return claudeSessionRetrieveErrorAction({ claudeSessionId, error });
  }
}
