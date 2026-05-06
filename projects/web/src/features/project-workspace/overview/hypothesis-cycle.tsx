import type { HypothesisRecord } from "@situ/protocol";
import { DxSection, muted } from "@situ/web-ui";
import filter from "lodash/filter";
import * as s from "../../../styles.css";
import { HypothesisCard } from "./hypothesis-card";
import { experimentsForHypothesis } from "../shared/relationship-selectors";
import type { ProjectWorkspaceData } from "../types";

export function HypothesisCycle({
  data,
  hypotheses,
}: {
  data: ProjectWorkspaceData;
  hypotheses: HypothesisRecord[];
}) {
  const activeHypotheses = filter(
    hypotheses,
    (hypothesis) => hypothesis.status === "active",
  );
  const openHypotheses = filter(
    hypotheses,
    (hypothesis) => hypothesis.status === "open",
  );
  const closedHypotheses = filter(
    hypotheses,
    (hypothesis) => hypothesis.status === "closed",
  );

  return (
    <DxSection title="Research Cycle">
      {hypotheses.length === 0 && (
        <p className={muted}>No hypotheses have been created yet.</p>
      )}

      {hypotheses.length > 0 && (
        <div className={s.cycleGrid}>
          <HypothesisLane
            data={data}
            title="Backlog"
            hypotheses={openHypotheses}
            emptyLabel="No backlog hypotheses"
          />
          <HypothesisLane
            data={data}
            title="In Progress"
            hypotheses={activeHypotheses}
            emptyLabel="No hypotheses in progress"
          />
          <HypothesisLane
            data={data}
            title="Done"
            hypotheses={closedHypotheses}
            emptyLabel="No completed hypotheses"
          />
        </div>
      )}
    </DxSection>
  );
}

function HypothesisLane({
  data,
  title,
  hypotheses,
  emptyLabel,
}: {
  data: ProjectWorkspaceData;
  title: string;
  hypotheses: HypothesisRecord[];
  emptyLabel: string;
}) {
  return (
    <section className={s.cycleLane}>
      <h3>{title}</h3>

      {hypotheses.length === 0 && <p className={muted}>{emptyLabel}</p>}

      {hypotheses.map((hypothesis) => (
        <HypothesisCard
          key={hypothesis.id}
          data={data}
          hypothesis={hypothesis}
          experiments={experimentsForHypothesis({
            data,
            hypothesisId: hypothesis.id,
          })}
        />
      ))}
    </section>
  );
}
