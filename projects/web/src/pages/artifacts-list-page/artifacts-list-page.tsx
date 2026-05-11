import { ArtifactsListView } from "@situ/web-app-ui";
import { useArtifacts } from "../../hooks/artifacts";

export function ArtifactsListPage() {
  return <ArtifactsListView artifacts={useArtifacts()} />;
}
