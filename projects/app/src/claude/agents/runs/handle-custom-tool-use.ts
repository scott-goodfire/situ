import { logModule } from "../../../modules/log";
import { jsonModule } from "../../../modules/json";
import { obs, withSpan } from "../../../observability";
import type { WorkItem } from "@situ/work-items";
import { getAnthropicClient } from "../anthropic-client";
import type { ClaudeAgentRole } from "../roles";
import { claudeAgentToolDefinitionByName, claudeAgentToolDefinitionForRole } from "../tools";
import type { ClaudeAgentToolResult } from "../tools";

export async function handleCustomToolUse({
  event,
  claudeSessionId,
  claudeAgentRunId,
  role,
  workItem,
  activeResearchTaskId,
  agentId,
}: {
  event: unknown;
  claudeSessionId: string;
  claudeAgentRunId: string;
  role: ClaudeAgentRole;
  workItem: WorkItem;
  activeResearchTaskId?: string;
  agentId?: string;
}): Promise<void> {
  const payload = jsonModule.record({ value: event });
  const name = typeof payload.name === "string" ? payload.name : "";
  const customToolUseId = typeof payload.id === "string" ? payload.id : "";
  if (!name || !customToolUseId) {
    throw new Error("Malformed Claude custom tool use event.");
  }

  const definition = claudeAgentToolDefinitionByName({ name });
  if (!definition) {
    throw new Error(`No situ custom tool registered for Claude tool: ${name}`);
  }

  const commonAttributes = {
    [obs.attr.claude.runId]: claudeAgentRunId,
    [obs.attr.claude.role]: role,
    [obs.attr.claude.sessionId]: claudeSessionId,
    [obs.attr.claude.toolName]: name,
    [obs.attr.claude.toolUseId]: customToolUseId,
    [obs.attr.workItem.id]: workItem.id,
  };
  const result = await withSpan<ClaudeAgentToolResult>({
    name: obs.span.claude.tool.execute,
    attributes: commonAttributes,
    fn: async ({ span }) => {
      const roleDefinition = claudeAgentToolDefinitionForRole({ name, role });
      if (!roleDefinition) {
        span.setAttribute(obs.attr.claude.toolResultIsError, true);
        return {
          content: `Tool ${name} is not available to ${role} agents.`,
          isError: true,
        };
      }

      try {
        const handlerResult = await roleDefinition.handler({
          input: payload.input,
          context: {
            agentId,
            claudeAgentRunId,
            workItem,
            activeResearchTaskId,
          },
        });
        span.setAttribute(obs.attr.claude.toolResultIsError, handlerResult.isError ?? false);
        return handlerResult;
      } catch (error) {
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        span.setAttribute(obs.attr.claude.toolResultIsError, true);
        logModule.warn(obs.log.claude.toolFailed, {
          ...commonAttributes,
          error,
        });
        return {
          content: error instanceof Error ? error.message : String(error),
          isError: true,
        };
      }
    },
  });

  const client = await getAnthropicClient();
  await withSpan({
    name: obs.span.claude.tool.sendResult,
    attributes: {
      ...commonAttributes,
      [obs.attr.claude.toolResultIsError]: result.isError ?? false,
    },
    fn: async () => {
      await client.beta.sessions.events.send(claudeSessionId, {
        events: [
          {
            type: "user.custom_tool_result",
            custom_tool_use_id: customToolUseId,
            is_error: result.isError ?? false,
            content: [{ type: "text", text: result.content }],
          },
        ],
      });
    },
  });
}
