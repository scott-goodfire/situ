import type { DxBadgeTone } from "@situ/web-ui";
import type { ResearchProjectInteractionStatus } from "../../domain/records";

export function researchProjectInteractionStatusTone({
  status,
}: {
  status: ResearchProjectInteractionStatus;
}): DxBadgeTone {
  switch (status) {
    case "pending":
      return "warning";
    case "answered":
    case "confirmed":
      return "success";
    case "rejected":
      return "danger";
    case "canceled":
      return "neutral";
  }
}
