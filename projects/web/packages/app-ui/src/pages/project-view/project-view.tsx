import { DxBadge, DxCard, DxMarkdown, DxStatBlock, mono } from "@situ/web-ui";
import { useState, type ReactNode } from "react";
import type {
  BaselineRecord,
  EvaluationRecord,
  MeasurementRecord,
  ResearchProjectRecord,
  ResearchTaskRecord,
  ResearchTaskVerificationRecord,
  ResearchProjectInteractionRecord,
} from "../../domain/records";
import { researchProjectStatusTone } from "../../__shared__";
import { researchProjectStatusLabel } from "../dashboard-view/status-label";
import { DateTime } from "luxon";
import * as s from "./project-view.css";

const FRONTIER_STATUSES = new Set<ResearchTaskRecord["status"]>([
  "planned",
  "running",
  "worker_complete",
  "verifying",
  "needs_more_evidence",
]);

export type ProjectViewProps = {
  project: ResearchProjectRecord | undefined;
  researchTasks: ResearchTaskRecord[];
  verifications: ResearchTaskVerificationRecord[];
  interactions: ResearchProjectInteractionRecord[];
  baselines?: BaselineRecord[];
  evaluations?: EvaluationRecord[];
  measurements?: MeasurementRecord[];
};

export function ProjectView({
  project,
  researchTasks,
  verifications,
  interactions,
  baselines = [],
  evaluations = [],
  measurements = [],
}: ProjectViewProps) {
  if (!project) {
    return (
      <div className={s.project}>
        <p className={s.empty}>No active research project.</p>
      </div>
    );
  }

  const projectResearchTasks = researchTasks.filter(
    (researchTask) => researchTask.projectId === project.id,
  );
  const projectVerifications = verifications.filter((verification) =>
    projectResearchTasks.some((researchTask) => researchTask.id === verification.researchTaskId),
  );
  const projectInteractions = interactions.filter(
    (interaction) => interaction.projectId === project.id,
  );
  const frontierCount = projectResearchTasks.filter((task) =>
    FRONTIER_STATUSES.has(task.status),
  ).length;
  const verifiedCount = projectResearchTasks.filter((task) => task.status === "verified").length;
  const failedVerificationCount = projectVerifications.filter(
    (verification) => verification.status === "fail" || verification.status === "suspicious",
  ).length;
  const pendingInteractionCount = projectInteractions.filter(
    (interaction) => interaction.status === "pending",
  ).length;

  const projectBaselines = baselines.filter(
    (baseline) => baseline.researchProjectId === project.id,
  );
  const baselineEntries = projectBaselines.map((baseline) => {
    const baselineEvaluations = evaluations.filter(
      (evaluation) => evaluation.associatedBaselineId === baseline.id,
    );
    const evaluationIds = new Set(baselineEvaluations.map((evaluation) => evaluation.id));
    const baselineMeasurements = measurements.filter((measurement) =>
      evaluationIds.has(measurement.evaluationId),
    );
    return { baseline, evaluations: baselineEvaluations, measurements: baselineMeasurements };
  });

  return (
    <div className={s.project}>
      <header className={s.header}>
        <div className={s.headerText}>
          <p className={s.eyebrow}>{project.id}</p>
          <h1 className={s.title}>{project.title}</h1>
        </div>
        <DxBadge tone={researchProjectStatusTone({ status: project.status })}>
          {researchProjectStatusLabel({ status: project.status })}
        </DxBadge>
      </header>

      <Section title="Objective">
        <ExpandableProse content={project.goal} emptyLabel="No objective set." />
      </Section>

      <Section title="Status">
        <div className={s.statsGrid}>
          <DxCard>
            <DxStatBlock
              value={frontierCount}
              caption="Frontier"
              detail="ResearchTasks in flight"
            />
          </DxCard>
          <DxCard>
            <DxStatBlock value={verifiedCount} caption="Verified" detail="Accepted ResearchTasks" />
          </DxCard>
          <DxCard>
            <DxStatBlock
              value={projectVerifications.length}
              caption="Verifications"
              detail={`${failedVerificationCount} failed or suspicious`}
            />
          </DxCard>
          <DxCard>
            <DxStatBlock
              value={pendingInteractionCount}
              caption="Pending"
              detail="User interactions awaiting reply"
            />
          </DxCard>
        </div>
      </Section>

      <Section title="Baseline">
        {project.baselineSummary ? (
          <div className={s.prose}>
            <DxMarkdown>{project.baselineSummary}</DxMarkdown>
          </div>
        ) : (
          <p className={s.empty}>No baseline summary yet.</p>
        )}
        {baselineEntries.length > 0 ? (
          <ul role="list" className={s.baselineList}>
            {baselineEntries.map(({ baseline, measurements: baselineMeasurements }) => (
              <li key={baseline.id} className={s.baselineEntry}>
                <DxCard>
                  <div className={s.baselineEntryBody}>
                    <header className={s.baselineEntryHeader}>
                      <p className={s.baselineEyebrow}>
                        <span className={mono}>{baseline.id}</span>
                      </p>
                      <h3 className={s.baselineTitle}>{baseline.title}</h3>
                    </header>
                    {baseline.summary ? (
                      <div className={s.prose}>
                        <DxMarkdown>{baseline.summary}</DxMarkdown>
                      </div>
                    ) : null}
                    {baselineMeasurements.length > 0 ? (
                      <div className={s.measurementsBlock}>
                        <p className={s.measurementsLabel}>Measurements</p>
                        <ul role="list" className={s.measurementList}>
                          {baselineMeasurements.map((measurement) => (
                            <li key={measurement.id} className={s.measurementItem}>
                              <span className={mono}>{measurement.actor}</span>
                              <span className={s.measurementBody}>{measurement.body}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </DxCard>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title="Report">
        {project.reportSummary ? (
          <>
            <div className={s.prose}>
              <DxMarkdown>{project.reportSummary}</DxMarkdown>
            </div>
            <p className={s.reportFooter}>Updated {formatUpdatedAt(project.updatedAt)}</p>
          </>
        ) : (
          <p className={s.empty}>The report will appear here when the project completes.</p>
        )}
      </Section>
    </div>
  );
}

function formatUpdatedAt(timestamp: string): string {
  const dt = DateTime.fromISO(timestamp, { zone: "utc" });
  if (!dt.isValid) {
    return timestamp;
  }
  return dt.toLocal().toFormat("LLL d, yyyy h:mm a");
}

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className={s.block}>
      <h2 className={s.sectionLabel}>{title}</h2>
      {children}
    </section>
  );
}

const PROSE_EXPAND_THRESHOLD = 200;

function ExpandableProse({ content, emptyLabel }: { content: string | null; emptyLabel: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!content) {
    return <p className={s.empty}>{emptyLabel}</p>;
  }
  const showToggle = content.length > PROSE_EXPAND_THRESHOLD;
  const proseClass = expanded || !showToggle ? s.prose : s.proseTruncated;
  return (
    <>
      <div className={proseClass}>
        <DxMarkdown>{content}</DxMarkdown>
      </div>
      {showToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={s.expandToggle}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </>
  );
}
