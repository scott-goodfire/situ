import { WorkItemsListView } from "@situ/web-app-ui";
import { useWorkItems } from "../../hooks/work-items";

export function WorkItemsListPage() {
  return <WorkItemsListView workItems={useWorkItems()} />;
}
