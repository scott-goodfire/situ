import type { DxBadgeTone } from "@situ/web-ui";
import type { FeedEntrySeverity } from "../../domain/records";

export function feedEntrySeverityTone({ severity }: { severity: FeedEntrySeverity }): DxBadgeTone {
  switch (severity) {
    case "info":
      return "neutral";
    case "progress":
      return "success";
    case "stuck":
      return "warning";
    case "failure":
      return "danger";
  }
}

export function feedEntrySeverityLabel({ severity }: { severity: FeedEntrySeverity }): string {
  switch (severity) {
    case "info":
      return "Info";
    case "progress":
      return "Progress";
    case "stuck":
      return "Stuck";
    case "failure":
      return "Failure";
  }
}
