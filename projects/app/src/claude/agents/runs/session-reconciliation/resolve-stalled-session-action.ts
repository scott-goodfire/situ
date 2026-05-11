import {
  claudeSessionReplaceStalledAction,
  ClaudeSessionReconciliationActionKind,
  type ClaudeSessionReconciliationAction,
} from "./claude-session-reconciliation-action";
import { readStalledSessionSignals } from "./read-stalled-session-signals";
import { shouldReplaceStalledSession } from "./should-replace-stalled-session";

/**
 * Local-only check for the stuck-in-retries_exhausted condition. When the
 * threshold + cooldown both fire, returns a {@link
 * ClaudeSessionReconciliationActionKind.ReplaceStalledSession} action. Returns
 * None otherwise. No Anthropic API call.
 */
export async function resolveStalledSessionAction({
  agentId,
  claudeSessionId,
  now = new Date(),
}: {
  agentId: string;
  claudeSessionId: string;
  now?: Date;
}): Promise<ClaudeSessionReconciliationAction> {
  const signals = await readStalledSessionSignals({ agentId });
  const shouldReplace = shouldReplaceStalledSession({
    exhaustedRetryCountSinceAttach: signals.exhaustedRetryCountSinceAttach,
    hadSuccessAfterMostRecentExhausted: signals.hadSuccessAfterMostRecentExhausted,
    lastReplacedAt: signals.sessionAttachedAt,
    now,
  });
  if (shouldReplace) {
    return claudeSessionReplaceStalledAction({
      claudeSessionId,
      exhaustedCount: signals.exhaustedRetryCountSinceAttach,
    });
  }
  return { kind: ClaudeSessionReconciliationActionKind.None };
}
