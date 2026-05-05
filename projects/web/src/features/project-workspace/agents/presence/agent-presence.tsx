export function AgentPresence({
  agentIds,
  detail,
  emptyLabel = "No agent activity yet",
}: {
  agentIds: string[];
  detail?: string;
  emptyLabel?: string;
}) {
  const visibleAgentIds = agentIds.slice(0, 2);
  const overflowCount = Math.max(agentIds.length - visibleAgentIds.length, 0);
  const label = presenceLabel({
    agentIds,
    detail,
    emptyLabel,
  });

  return (
    <div
      className="almanac-agent-presence"
      data-empty={agentIds.length === 0}
    >
      {visibleAgentIds.length > 0 && (
        <div className="almanac-agent-presence__avatars" aria-hidden="true">
          {visibleAgentIds.map((agentId) => (
            <span className="almanac-agent-presence__avatar" key={agentId}>
              {agentInitials({ agentId })}
            </span>
          ))}
          {overflowCount > 0 && (
            <span className="almanac-agent-presence__overflow">
              +{overflowCount}
            </span>
          )}
        </div>
      )}
      <span className="almanac-agent-presence__label">{label}</span>
    </div>
  );
}

function presenceLabel({
  agentIds,
  detail,
  emptyLabel,
}: {
  agentIds: string[];
  detail: string | undefined;
  emptyLabel: string;
}): string {
  if (agentIds.length === 0) {
    return detail ?? emptyLabel;
  }

  const agentLabel = agentsLabel({
    agentIds,
  });

  if (!detail) {
    return agentLabel;
  }

  return `${agentLabel} / ${detail}`;
}

function agentsLabel({
  agentIds,
}: {
  agentIds: string[];
}): string {
  if (agentIds.length === 1) {
    return agentIds[0] ?? "agent";
  }

  if (agentIds.length === 2) {
    return `${agentIds[0]} + ${agentIds[1]}`;
  }

  return `${agentIds[0]} + ${agentIds.length - 1} more`;
}

function agentInitials({
  agentId,
}: {
  agentId: string;
}): string {
  const parts = agentId
    .split(/[-_\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "A";
  }

  const initials = parts
    .slice(0, 2)
    .map((part) => part.at(0)?.toUpperCase() ?? "")
    .join("");

  return initials || "A";
}
