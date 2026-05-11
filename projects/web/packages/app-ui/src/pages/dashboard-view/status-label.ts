import type { ResearchProjectStatus } from "../../domain/records";

const STATUS_LABELS: Record<ResearchProjectStatus, string> = {
  draft: "Draft",
  onboarding: "Onboarding",
  researching: "Researching",
  verifying: "Verifying",
  reporting: "Reporting",
  complete: "Complete",
  blocked: "Blocked",
  failed: "Failed",
  canceled: "Canceled",
};

export function researchProjectStatusLabel({ status }: { status: ResearchProjectStatus }): string {
  return STATUS_LABELS[status];
}
