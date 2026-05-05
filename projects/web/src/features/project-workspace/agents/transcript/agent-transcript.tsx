import { DxSection } from "@situ/web-ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import { TranscriptItem } from "./transcript-item";
import type { AgentTranscriptItem } from "./types";

export function AgentTranscript({
  projectId,
  items,
}: {
  projectId: string;
  items: AgentTranscriptItem[];
}) {
  const prefersReducedMotion = useReducedMotion();
  const trigger = useMemo(
    () => items.map((item) => item.id).join("\u001f"),
    [items],
  );
  const autoScroll = useTranscriptAutoScroll({
    trigger,
    smooth: prefersReducedMotion !== true,
  });

  if (items.length === 0) {
    return (
      <DxSection title="Transcript">
        <p className="dx-muted">No transcript activity for this agent yet</p>
      </DxSection>
    );
  }

  const shouldAnimate = prefersReducedMotion !== true;

  return (
    <DxSection title="Transcript">
      <div
        className="situ-agent-transcript"
        ref={autoScroll.scrollRef}
        onScroll={autoScroll.handleScroll}
      >
        <ol className="situ-agent-transcript__list">
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <motion.li
                className="situ-agent-transcript__row"
                key={item.id}
                layout={shouldAnimate}
                initial={shouldAnimate ? { opacity: 0, y: 6 } : false}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
                exit={shouldAnimate ? { opacity: 0 } : undefined}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <TranscriptItem
                  item={item}
                  projectId={projectId}
                  isLatest={index === items.length - 1}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
        <div
          className="situ-agent-transcript__anchor"
          ref={autoScroll.anchorRef}
        />
      </div>
    </DxSection>
  );
}

function useTranscriptAutoScroll({
  trigger,
  smooth,
}: {
  trigger: string;
  smooth: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);
  const lastTriggerRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const scrollElement = scrollRef.current;

    if (!scrollElement) {
      return;
    }

    pinnedToBottomRef.current = isPinnedToBottom({
      element: scrollElement,
    });
  }, []);

  useEffect(() => {
    const isInitialScroll = lastTriggerRef.current === undefined;

    if (!isInitialScroll && lastTriggerRef.current === trigger) {
      return;
    }

    lastTriggerRef.current = trigger;

    if (!isInitialScroll && !pinnedToBottomRef.current) {
      return;
    }

    anchorRef.current?.scrollIntoView({
      block: "end",
      behavior: smooth ? "smooth" : "auto",
    });
  }, [smooth, trigger]);

  return {
    scrollRef,
    anchorRef,
    handleScroll: () => {
      const scrollElement = scrollRef.current;

      if (!scrollElement) {
        return;
      }

      pinnedToBottomRef.current = isPinnedToBottom({
        element: scrollElement,
      });
    },
  };
}

function isPinnedToBottom({
  element,
}: {
  element: HTMLDivElement;
}): boolean {
  const distanceToBottom =
    element.scrollHeight - element.scrollTop - element.clientHeight;

  return distanceToBottom < 40;
}
