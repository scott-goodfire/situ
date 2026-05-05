import { DxBadge, DxCard, DxStat } from "@situ/web-ui";
import type { ReactNode } from "react";

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
    <div style={{ display: "grid", gap: 16 }}>
      <header style={{ display: "grid", gap: 4 }}>
        <span
          style={{
            fontSize: "var(--text-product-sm)",
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--muted-foreground)",
          }}
        >
          Research Cycle
        </span>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 14,
        }}
      >
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
    <section style={{ display: "grid", alignContent: "start", gap: 8, minWidth: 0 }}>
      <h3
        style={{
          margin: 0,
          color: "var(--muted-foreground)",
          fontSize: "var(--text-product-sm)",
          fontWeight: 500,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </h3>

      {hypotheses.length === 0 ? (
        <p
          style={{
            margin: 0,
            color: "var(--muted-foreground-tertiary)",
            fontSize: "var(--text-product-lg)",
          }}
        >
          {emptyLabel}
        </p>
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
      <div style={{ display: "grid", gap: 10 }}>
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: "var(--text-product-lg)", fontWeight: 500 }}>
              {hypothesis.title}
            </span>
            <span
              style={{
                color: "var(--muted-foreground-tertiary)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-product-sm)",
              }}
            >
              {hypothesis.id}
            </span>
          </div>
          <StatusBadge status={hypothesis.status} />
        </header>

        <p
          style={{
            margin: 0,
            color: "var(--muted-foreground)",
            fontSize: "var(--text-product-lg)",
            lineHeight: "var(--leading-product-base)",
          }}
        >
          {hypothesis.summary}
        </p>

        {hypothesis.agents && (
          <div
            style={{
              color: "var(--muted-foreground)",
              fontSize: "var(--text-product-lg)",
            }}
          >
            {hypothesis.agents}
          </div>
        )}

        {hypothesis.evidence && (
          <p
            style={{
              margin: 0,
              color: "var(--muted-foreground)",
              fontSize: "var(--text-product-lg)",
              lineHeight: "var(--leading-product-base)",
            }}
          >
            {hypothesis.evidence}
          </p>
        )}

        {(hypothesis.diffAdded !== undefined ||
          hypothesis.diffRemoved !== undefined ||
          hypothesis.experimentLabel) && (
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {hypothesis.diffAdded !== undefined && (
              <DxStat tone="added">+{hypothesis.diffAdded}</DxStat>
            )}
            {hypothesis.diffRemoved !== undefined && (
              <DxStat tone="removed">−{hypothesis.diffRemoved}</DxStat>
            )}
            {hypothesis.experimentLabel && (
              <span
                style={{
                  fontSize: "var(--text-product-lg)",
                  fontWeight: 500,
                }}
              >
                {hypothesis.experimentLabel}
              </span>
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
