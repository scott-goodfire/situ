import type {
  EventRecord,
  ExperimentRecord,
  HypothesisRecord,
  SessionRecord,
} from "@situ/protocol";
import { DxBadge, DxEmptyState, DxSection } from "@situ/web-ui";
import type { ReactNode } from "react";
import * as s from "../../styles.css";

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
    <div className={s.viewStackWide}>
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
            <div key={event.id} className={s.fieldRowEvent}>
              <span className={s.monoTertiary}>{event.created_at}</span>
              <DxBadge>{event.type}</DxBadge>
              <span className={s.cellMuted}>{event.message}</span>
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
    <header className={s.runHeader}>
      <h1 className={s.pageHeaderTitle}>Run monitor</h1>
      <div className={s.runHeaderMeta}>
        <span className={s.monoTertiary}>{session.id}</span>
        <span>{session.status}</span>
        <span className={s.monoTertiary}>{session.created_at}</span>
      </div>
    </header>
  );
}

function FieldList({ children }: { children: ReactNode }) {
  return <div className={s.fieldList}>{children}</div>;
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
    <div className={s.fieldRow}>
      <span className={s.monoTertiary}>{id}</span>
      <span>{title}</span>
      <DxBadge>{status}</DxBadge>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className={s.emptyText}>{children}</p>;
}
