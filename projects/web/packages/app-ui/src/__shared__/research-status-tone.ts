import type { DxBadgeTone } from "@situ/web-ui";
import type { ResearchStatus } from "../domain/records";

export function researchStatusTone({ status }: { status: ResearchStatus }): DxBadgeTone {
  switch (status) {
    case "done":
      return "success";
    case "active":
    case "in_review":
      return "warning";
    case "failed":
      return "danger";
    case "triage":
    case "accepted":
    case "canceled":
      return "neutral";
  }
}
