import { EntityLinksListView } from "@situ/web-app-ui";
import { useEntityLinks } from "../../hooks/entity-links";

export function EntityLinksListPage() {
  return <EntityLinksListView entityLinks={useEntityLinks()} />;
}
