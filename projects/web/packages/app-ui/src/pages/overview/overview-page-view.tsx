import { DxBadge, DxCard, DxStat } from "@situ/web-ui";
import type { ReactNode } from "react";
import * as s from "../../styles.css";

export type OverviewHypothesisStatus = "open" | "active" | "closed";

export type OverviewHypothesis = {
  id: string;
  title: ReactNode;
  status: OverviewHypothesisStatus;
  summary: ReactNode;
  evidence?: ReactNode;
  agents?: ReactNode;
  experimentLabel?: ReactNode;
  diffAdded?: number;
  diffRemoved?: number;
};

export function OverviewPageView({
  hypotheses,
}: {
  hypotheses: OverviewHypothesis[];
}) {
  const open = hypotheses.filter((h) => h.status === "open");
  const active = hypotheses.filter((h) => h.status === "active");
  const closed = hypotheses.filter((h) => h.status === "closed");

  return (
    <div className={s.viewStack}>
      <header className={s.overviewHeader}>
        <span className={s.overviewEyebrow}>Research Cycle</span>
      </header>

      <div className={s.overviewLanes}>
        <Lane title="Backlog" hypotheses={open} emptyLabel="No backlog hypotheses" />
        <Lane
          title="In Progress"
          hypotheses={active}
          emptyLabel="No hypotheses in progress"
        />
        <Lane title="Done" hypotheses={closed} emptyLabel="No completed hypotheses" />
      </div>
    </div>
  );
}

function Lane({
  title,
  hypotheses,
  emptyLabel,
}: {
  title: string;
  hypotheses: OverviewHypothesis[];
  emptyLabel: string;
}) {
  return (
    <section className={s.overviewLane}>
      <h3 className={s.overviewLaneTitle}>{title}</h3>

      {hypotheses.length === 0 ? (
        <p className={s.overviewLaneEmpty}>{emptyLabel}</p>
      ) : (
        hypotheses.map((hypothesis) => (
          <HypothesisCard key={hypothesis.id} hypothesis={hypothesis} />
        ))
      )}
    </section>
  );
}

function HypothesisCard({ hypothesis }: { hypothesis: OverviewHypothesis }) {
  return (
    <DxCard>
      <div className={s.cardStack}>
        <header className={s.cardHeader}>
          <div className={s.cardTitleStack}>
            <span className={s.cardTitle}>{hypothesis.title}</span>
            <span className={s.monoTertiary}>{hypothesis.id}</span>
          </div>
          <StatusBadge status={hypothesis.status} />
        </header>

        <p className={s.cardSummary}>{hypothesis.summary}</p>

        {hypothesis.agents && <div className={s.cardAgents}>{hypothesis.agents}</div>}

        {hypothesis.evidence && <p className={s.cardSummary}>{hypothesis.evidence}</p>}

        {(hypothesis.diffAdded !== undefined ||
          hypothesis.diffRemoved !== undefined ||
          hypothesis.experimentLabel) && (
          <div className={s.cardFooter}>
            {hypothesis.diffAdded !== undefined && (
              <DxStat tone="added">+{hypothesis.diffAdded}</DxStat>
            )}
            {hypothesis.diffRemoved !== undefined && (
              <DxStat tone="removed">−{hypothesis.diffRemoved}</DxStat>
            )}
            {hypothesis.experimentLabel && (
              <span className={s.cardLabel}>{hypothesis.experimentLabel}</span>
            )}
          </div>
        )}
      </div>
    </DxCard>
  );
}

function StatusBadge({ status }: { status: OverviewHypothesisStatus }) {
  if (status === "active") {
    return <DxBadge tone="success">active</DxBadge>;
  }

  if (status === "open") {
    return <DxBadge tone="warning">open</DxBadge>;
  }

  return <DxBadge>closed</DxBadge>;
}
