import type { DxBadgeTone } from "@situ/web-ui";
import type {
  ResearchProjectStatus,
  ResearchTaskStatus,
  ResearchTaskVerificationStatus,
} from "../domain/records";

export function researchProjectStatusTone({
  status,
}: {
  status: ResearchProjectStatus;
}): DxBadgeTone {
  switch (status) {
    case "complete":
      return "success";
    case "onboarding":
    case "researching":
    case "verifying":
    case "reporting":
    case "blocked":
      return "warning";
    case "failed":
      return "danger";
    case "draft":
    case "canceled":
      return "neutral";
  }
}

export function researchTaskStatusTone({ status }: { status: ResearchTaskStatus }): DxBadgeTone {
  switch (status) {
    case "verified":
      return "success";
    case "running":
    case "worker_complete":
    case "verifying":
    case "needs_more_evidence":
      return "warning";
    case "rejected":
    case "failed":
      return "danger";
    case "planned":
    case "pruned":
      return "neutral";
  }
}

export function researchTaskVerificationStatusTone({
  status,
}: {
  status: ResearchTaskVerificationStatus;
}): DxBadgeTone {
  switch (status) {
    case "pass":
      return "success";
    case "needs_more_evidence":
    case "pending":
    case "suspicious":
      return "warning";
    case "fail":
      return "danger";
  }
}
