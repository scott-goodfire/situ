import type { ArtifactRecord } from "@situ/protocol";
import { useEntityList } from "../entity";

export function useArtifacts(): ArtifactRecord[] {
  return useEntityList<ArtifactRecord>("artifacts/");
}
