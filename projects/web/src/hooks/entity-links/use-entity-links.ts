import type { EntityLinkRecord } from "@situ/protocol";
import { useEntityList } from "../entity";

export function useEntityLinks(): EntityLinkRecord[] {
  return useEntityList<EntityLinkRecord>("entityLinks/");
}
