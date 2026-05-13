import { agentSessionLogs, agentSessions } from "@situ/agent-sessions";
import { agents } from "@situ/agents";
import { artifacts } from "@situ/artifacts";
import { comments } from "@situ/comments";
import { events } from "@situ/events";
import { experiments } from "@situ/experiments";
import { measurements } from "@situ/measurements";
import { notifications } from "@situ/notifications";
import { projects } from "@situ/projects";
import { reviews } from "@situ/reviews";
import { labels } from "@situ/tasks";
import { tasks } from "@situ/tasks";

export const schema = {
  agentSessionLogs,
  agentSessions,
  agents,
  artifacts,
  comments,
  events,
  experiments,
  labels,
  measurements,
  notifications,
  projects,
  reviews,
  tasks,
};

export type AppSchema = typeof schema;
