import { Hono } from "hono";
import { replicacheRoutes } from "./replicache";
import { researchProjectRoutes } from "./research-projects";
import { settingsRoutes } from "./settings";
import { statusRoutes } from "./status";

export function apiRoutes(): Hono {
  const api = new Hono();
  api.route("/", statusRoutes);
  api.route("/", settingsRoutes);
  api.route("/", researchProjectRoutes);
  api.route("/", replicacheRoutes);
  return api;
}
