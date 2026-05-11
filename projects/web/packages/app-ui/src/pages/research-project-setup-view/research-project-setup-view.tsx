import { DxBadge, DxButton, DxCard, DxMarkdown, DxSection } from "@situ/web-ui";
import { useState, type FormEvent } from "react";
import type {
  ResearchProjectInteractionRecord,
  ResearchProjectRecord,
  ResearchProjectStatus,
} from "../../domain/records";
import { researchProjectStatusTone } from "../../__shared__";
import * as shared from "../../styles.css";
import * as s from "./research-project-setup-view.css";

export type CreateResearchProjectInput = {
  goal: string;
};

export type ResolveResearchProjectInteractionInput = {
  interactionId: string;
  response?: string;
};

export function ResearchProjectSetupView({
  projects,
  interactions,
  anthropicKeyConfigured,
  onCreateResearchProject,
  onAnswerInteraction,
  onConfirmInteraction,
  onRejectInteraction,
}: {
  projects: ResearchProjectRecord[];
  interactions: ResearchProjectInteractionRecord[];
  anthropicKeyConfigured: boolean;
  onCreateResearchProject: (input: CreateResearchProjectInput) => Promise<void>;
  onAnswerInteraction: (input: ResolveResearchProjectInteractionInput) => Promise<void>;
  onConfirmInteraction: (input: ResolveResearchProjectInteractionInput) => Promise<void>;
  onRejectInteraction: (input: ResolveResearchProjectInteractionInput) => Promise<void>;
}) {
  const [goal, setGoal] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sortedProjects = [...projects].sort(compareProjects);
  const activeProject = sortedProjects.find((project) =>
    isActiveProject({ status: project.status }),
  );
  const latestProject = activeProject ?? sortedProjects[0];
  const pendingInteractions = interactions.filter(
    (interaction) =>
      interaction.status === "pending" && interaction.projectId === latestProject?.id,
  );

  const submitProject = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreateResearchProject({ goal });
      setGoal("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  const resolveInteraction = async ({
    interaction,
    action,
  }: {
    interaction: ResearchProjectInteractionRecord;
    action: "answer" | "confirm" | "reject";
  }) => {
    const response = responses[interaction.id]?.trim();
    setBusy(true);
    setError(null);
    try {
      if (action === "answer") {
        await onAnswerInteraction({ interactionId: interaction.id, response });
      } else if (action === "confirm") {
        await onConfirmInteraction({ interactionId: interaction.id, response });
      } else {
        await onRejectInteraction({ interactionId: interaction.id, response });
      }
      setResponses((current) => {
        const next = { ...current };
        delete next[interaction.id];
        return next;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={shared.viewStack}>
      <DxSection title="Research Project">
        <div className={s.layout}>
          {!anthropicKeyConfigured && (
            <DxCard tone="warning">
              <p className={s.detailText}>
                Anthropic API key is not configured. The research goal can be drafted, but Manager
                work starts after the key is saved.
              </p>
            </DxCard>
          )}

          {error && <p className={s.error}>{error}</p>}

          {activeProject ? (
            <ProjectCard heading="Current Research Project" project={activeProject} />
          ) : (
            <form className={s.form} onSubmit={submitProject}>
              <label className={s.field}>
                <span className={s.label}>Research Goal</span>
                <textarea
                  className={s.textarea}
                  value={goal}
                  onChange={(event) => setGoal(event.currentTarget.value)}
                  placeholder="Describe what the manager should understand, verify, or improve."
                  required
                />
              </label>
              <div className={s.actions}>
                <DxButton type="submit" variant="primary" disabled={busy}>
                  Start Research Project
                </DxButton>
              </div>
            </form>
          )}

          {!activeProject && latestProject && (
            <ProjectCard heading="Last Research Project" project={latestProject} />
          )}

          {pendingInteractions.length > 0 && (
            <div className={s.checkpointList}>
              {pendingInteractions.map((interaction) => (
                <DxCard key={interaction.id}>
                  <div className={s.checkpoint}>
                    <div className={s.checkpointHeader}>
                      <h3 className={s.checkpointTitle}>
                        {interaction.kind === "question" ? "Manager Question" : "Baseline Review"}
                      </h3>
                      <DxBadge tone="warning">{interaction.kind}</DxBadge>
                    </div>
                    <DxMarkdown>{interaction.prompt}</DxMarkdown>
                    {interaction.details && <DxMarkdown>{interaction.details}</DxMarkdown>}
                    <label className={s.field}>
                      <span className={s.label}>
                        {interaction.kind === "question" ? "Answer" : "Notes"}
                      </span>
                      <textarea
                        className={s.textarea}
                        value={responses[interaction.id] ?? ""}
                        onChange={(event) =>
                          setResponses((current) => ({
                            ...current,
                            [interaction.id]: event.currentTarget.value,
                          }))
                        }
                      />
                    </label>
                    <div className={s.actions}>
                      {interaction.kind === "question" ? (
                        <DxButton
                          variant="primary"
                          disabled={busy}
                          onClick={() => resolveInteraction({ interaction, action: "answer" })}
                        >
                          Send Answer
                        </DxButton>
                      ) : (
                        <>
                          <DxButton
                            variant="primary"
                            disabled={busy}
                            onClick={() => resolveInteraction({ interaction, action: "confirm" })}
                          >
                            Confirm
                          </DxButton>
                          <DxButton
                            variant="secondary"
                            disabled={busy}
                            onClick={() => resolveInteraction({ interaction, action: "reject" })}
                          >
                            Needs Changes
                          </DxButton>
                        </>
                      )}
                    </div>
                  </div>
                </DxCard>
              ))}
            </div>
          )}
        </div>
      </DxSection>
    </div>
  );
}

function ProjectCard({ heading, project }: { heading: string; project: ResearchProjectRecord }) {
  return (
    <DxCard>
      <div className={s.goalCard}>
        <div className={s.goalHeader}>
          <h3 className={s.goalTitle}>{heading}</h3>
          <DxBadge tone={researchProjectStatusTone({ status: project.status })}>
            {projectStatusLabel({ status: project.status })}
          </DxBadge>
        </div>
        <DxMarkdown>{project.goal}</DxMarkdown>
        {project.reportSummary && <p className={s.detailText}>{project.reportSummary}</p>}
      </div>
    </DxCard>
  );
}

function compareProjects(left: ResearchProjectRecord, right: ResearchProjectRecord): number {
  const updatedComparison = right.updatedAt.localeCompare(left.updatedAt);
  if (updatedComparison !== 0) {
    return updatedComparison;
  }
  return right.createdAt.localeCompare(left.createdAt);
}

function isActiveProject({ status }: { status: ResearchProjectStatus }): boolean {
  return status !== "complete" && status !== "failed" && status !== "canceled";
}

function projectStatusLabel({ status }: { status: ResearchProjectStatus }): string {
  switch (status) {
    case "blocked":
      return "Waiting for you";
    case "researching":
      return "Research";
    case "verifying":
      return "Verification";
    default:
      return status;
  }
}
