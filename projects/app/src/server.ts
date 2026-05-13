import { Hono } from "hono";

import { commentsModule } from "@situ/comments";
import { eventsModule } from "@situ/events";
import { notificationsModule } from "@situ/notifications";
import { projectsModule } from "@situ/projects";
import { tasksModule } from "@situ/tasks";

const modules = [
  projectsModule,
  tasksModule,
  commentsModule,
  notificationsModule,
  eventsModule,
] as const;

export const createServer = () => {
  const app = new Hono();

  app.get("/api/status", (context) =>
    context.json({
      ok: true,
      service: "situ",
      modules: modules.map((module) => module.name),
    }),
  );

  return app;
};
