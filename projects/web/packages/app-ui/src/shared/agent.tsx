import { DxSection, muted } from "@situ/web-ui";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { MarkdownText } from "./markdown-text";
import * as s from "../styles.css";

export type AgentTranscriptTone = "neutral" | "warning" | "danger";

export type AgentTranscriptItemView = {
  id: string;
  title: ReactNode;
  body: ReactNode;
  createdAt: string;
  tone: AgentTranscriptTone;
  activityType: ReactNode;
  entityKind: ReactNode;
  entityLink: ReactNode;
};

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
  const label = presenceLabel({ agentIds, detail, emptyLabel });

  return (
    <div className={s.agentPresence} data-empty={agentIds.length === 0}>
      {visibleAgentIds.length > 0 && (
        <div className={s.agentPresenceAvatars} aria-hidden="true">
          {visibleAgentIds.map((agentId) => (
            <span className={s.agentPresenceAvatar} key={agentId}>
              {agentInitials({ agentId })}
            </span>
          ))}
          {overflowCount > 0 && (
            <span className={s.agentPresenceOverflow}>+{overflowCount}</span>
          )}
        </div>
      )}
      <span className={s.agentPresenceLabel}>{label}</span>
    </div>
  );
}

export function AgentTranscript({
  items,
}: {
  items: AgentTranscriptItemView[];
}) {
  const trigger = useMemo(() => items.map((item) => item.id).join(""), [items]);
  const autoScroll = useTranscriptAutoScroll({ trigger });

  if (items.length === 0) {
    return (
      <DxSection title="Transcript">
        <p className={muted}>No transcript activity for this agent yet</p>
      </DxSection>
    );
  }

  return (
    <DxSection title="Transcript">
      <div
        className={s.agentTranscript}
        ref={autoScroll.scrollRef}
        onScroll={autoScroll.handleScroll}
      >
        <ol className={s.agentTranscriptList}>
          {items.map((item, index) => (
            <li className={s.agentTranscriptRow} key={item.id}>
              <TranscriptItem item={item} isLatest={index === items.length - 1} />
            </li>
          ))}
        </ol>
        <div className={s.agentTranscriptAnchor} ref={autoScroll.anchorRef} />
      </div>
    </DxSection>
  );
}

function TranscriptItem({
  item,
  isLatest,
}: {
  item: AgentTranscriptItemView;
  isLatest: boolean;
}) {
  return (
    <article
      className={s.transcriptItem}
      data-tone={item.tone}
      data-latest={isLatest}
    >
      <div className={s.transcriptItemRail} aria-hidden="true">
        <span className={s.transcriptItemDot} />
      </div>

      <div className={s.transcriptItemContent}>
        <header className={s.transcriptItemHeader}>
          <div className={s.transcriptItemTitle}>
            <MarkdownText value={item.title} variant="inline" />
            <span className={s.transcriptItemPreposition}>on</span>
            {item.entityLink}
          </div>
          <time dateTime={item.createdAt}>{formatTime({ value: item.createdAt })}</time>
        </header>

        <MarkdownText value={item.body} className={s.transcriptItemBody} />

        <footer className={s.transcriptItemMeta}>
          <span>{item.entityKind}</span>
          <span>{item.activityType}</span>
        </footer>
      </div>
    </article>
  );
}

function useTranscriptAutoScroll({ trigger }: { trigger: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);
  const lastTriggerRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    pinnedToBottomRef.current = isPinnedToBottom({ element: scrollElement });
  }, []);

  useEffect(() => {
    const isInitialScroll = lastTriggerRef.current === undefined;
    if (!isInitialScroll && lastTriggerRef.current === trigger) return;
    lastTriggerRef.current = trigger;
    if (!isInitialScroll && !pinnedToBottomRef.current) return;
    anchorRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [trigger]);

  return {
    scrollRef,
    anchorRef,
    handleScroll: () => {
      const scrollElement = scrollRef.current;
      if (!scrollElement) return;
      pinnedToBottomRef.current = isPinnedToBottom({ element: scrollElement });
    },
  };
}

function isPinnedToBottom({ element }: { element: HTMLDivElement }): boolean {
  const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
  return distanceToBottom < 40;
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
  if (agentIds.length === 0) return detail ?? emptyLabel;
  const agentLabel = agentsLabel({ agentIds });
  if (!detail) return agentLabel;
  return `${agentLabel} / ${detail}`;
}

function agentsLabel({ agentIds }: { agentIds: string[] }): string {
  if (agentIds.length === 1) return agentIds[0] ?? "agent";
  if (agentIds.length === 2) return `${agentIds[0]} + ${agentIds[1]}`;
  return `${agentIds[0]} + ${agentIds.length - 1} more`;
}

function agentInitials({ agentId }: { agentId: string }): string {
  const parts = agentId
    .split(/[-_\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "A";
  const initials = parts
    .slice(0, 2)
    .map((part) => part.at(0)?.toUpperCase() ?? "")
    .join("");
  return initials || "A";
}

function formatTime({ value }: { value: string }): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
