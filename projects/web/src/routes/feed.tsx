import { createFileRoute } from "@tanstack/react-router";
import { FeedPage } from "../pages/feed-page";

export const Route = createFileRoute("/feed")({
  component: FeedPage,
});
