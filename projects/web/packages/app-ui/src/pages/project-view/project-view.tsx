import { DxAccordion, DxBadge, DxCard, DxMarkdown, DxStatBlock } from "@situ/web-ui";
import type { ReactNode } from "react";
import type {
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
};

export function ProjectView({
  project,
  researchTasks,
  verifications,
  interactions,
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

      <DxAccordion
        items={[
          {
            id: "objective",
            question: "Objective",
            answer: project.goal ? (
              <div className={s.prose}>
                <DxMarkdown>{project.goal}</DxMarkdown>
              </div>
            ) : (
              <p className={s.empty}>No objective set.</p>
            ),
          },
        ]}
      />

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
