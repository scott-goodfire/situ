import { EventsPageView } from "@situ/web-app-ui";
import type { ProjectWorkspaceData } from "../types";

export function EventsPage({ data }: { data: ProjectWorkspaceData }) {
  return <EventsPageView events={data.events} />;
}
