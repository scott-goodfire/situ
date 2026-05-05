import type {
  EventRecord,
  ExperimentRecord,
  HypothesisRecord,
  SessionRecord,
} from "@situ/protocol";
import { DxBadge, DxEmptyState, DxSection } from "@situ/web-ui";
import type { ReactNode } from "react";

export function RunMonitorView({
  session,
  hypotheses,
  experiments,
  events,
}: {
  session?: SessionRecord;
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  events: EventRecord[];
}) {
  if (!session) {
    return (
      <DxEmptyState heading="No active session" description="Start a session to see live data." />
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <SessionHeader session={session} />

      <DxSection title="Hypotheses">
        <FieldList>
          {hypotheses.map((hypothesis) => (
            <FieldRow
              key={hypothesis.id}
              id={hypothesis.id}
              title={hypothesis.title}
              status={hypothesis.status}
            />
          ))}
          {hypotheses.length === 0 && <Empty>No hypotheses.</Empty>}
        </FieldList>
      </DxSection>

      <DxSection title="Experiments">
        <FieldList>
          {experiments.map((experiment) => (
            <FieldRow
              key={experiment.id}
              id={experiment.id}
              title={experiment.title}
              status={experiment.status}
            />
          ))}
          {experiments.length === 0 && <Empty>No experiments.</Empty>}
        </FieldList>
      </DxSection>

      <DxSection title="Events">
        <FieldList>
          {events.map((event) => (
            <div
              key={event.id}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 140px 1fr",
                gap: 12,
                padding: "6px 0",
                borderBottom: "1px solid var(--border-01-5)",
              }}
            >
              <Mono>{event.created_at}</Mono>
              <DxBadge>{event.type}</DxBadge>
              <span style={{ color: "var(--muted-foreground)" }}>{event.message}</span>
            </div>
          ))}
          {events.length === 0 && <Empty>No events.</Empty>}
        </FieldList>
      </DxSection>
    </div>
  );
}

function SessionHeader({ session }: { session: SessionRecord }) {
  return (
    <header style={{ display: "grid", gap: 4 }}>
      <h1
        style={{
          margin: 0,
          fontSize: "var(--text-display-md)",
          fontWeight: 500,
          letterSpacing: "var(--tracking-display)",
        }}
      >
        Run monitor
      </h1>
      <div style={{ display: "flex", gap: 12, color: "var(--muted-foreground)", fontSize: "var(--text-product-lg)" }}>
        <Mono>{session.id}</Mono>
        <span>{session.status}</span>
        <Mono>{session.created_at}</Mono>
      </div>
    </header>
  );
}

function FieldList({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gap: 0 }}>{children}</div>;
}

function FieldRow({
  id,
  title,
  status,
}: {
  id: string;
  title: string;
  status: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr 110px",
        gap: 12,
        padding: "6px 0",
        borderBottom: "1px solid var(--border-01-5)",
        alignItems: "center",
      }}
    >
      <Mono>{id}</Mono>
      <span style={{ color: "var(--foreground)" }}>{title}</span>
      <DxBadge>{status}</DxBadge>
    </div>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-product-sm)",
        color: "var(--muted-foreground-tertiary)",
      }}
    >
      {children}
    </span>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p style={{ color: "var(--muted-foreground-tertiary)", fontSize: "var(--text-product-lg)" }}>
      {children}
    </p>
  );
}
