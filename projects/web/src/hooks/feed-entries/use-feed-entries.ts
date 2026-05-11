import type { FeedEntryRecord } from "@situ/protocol";
import { useEntityList } from "../entity";

export function useFeedEntries(): FeedEntryRecord[] {
  return useEntityList<FeedEntryRecord>("feedEntries/");
}
