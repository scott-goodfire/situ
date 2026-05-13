import { Hono } from "hono";

import { agentSessionsModule } from "@situ/agent-sessions";
import { agentsModule } from "@situ/agents";
import { artifactsModule } from "@situ/artifacts";
import { commentsModule } from "@situ/comments";
import { eventsModule } from "@situ/events";
import { experimentsModule } from "@situ/experiments";
import { measurementsModule } from "@situ/measurements";
import { notificationsModule } from "@situ/notifications";
import { projectsModule } from "@situ/projects";
import { reviewsModule } from "@situ/reviews";
import { tasksModule } from "@situ/tasks";
import { events } from "@situ/events";

import { createAppActions } from "./actions";
import { createDatabase, type AppDatabase } from "./db";
import { applyPush, createPullResponse } from "./sync";

export type CreateServerInput = {
  db?: AppDatabase;
};

const modules = [
  agentsModule,
  agentSessionsModule,
  projectsModule,
  tasksModule,
  experimentsModule,
  measurementsModule,
  artifactsModule,
  reviewsModule,
  commentsModule,
  notificationsModule,
  eventsModule,
] as const;

/**
 * Creates the HTTP server.
 */
export const createServer = ({ db = createDatabase() }: CreateServerInput = {}) => {
  const app = new Hono();
  const actions = createAppActions({ db });

  app.get("/api/status", (context) =>
    context.json({
      ok: true,
      service: "situ",
      modules: modules.map((module) => module.name),
    }),
  );

  app.post("/api/replicache/pull", (context) =>
    context.req.json().then(() => context.json(createPullResponse({ db }))),
  );

  app.post("/api/replicache/push", (context) =>
    context.req.json().then((request) =>
      context.json(
        applyPush({
          actions,
          db,
          request,
        }),
      ),
    ),
  );

  app.get("/api/events", (context) =>
    context.json({
      events: db.select().from(events).all(),
    }),
  );

  return app;
};
