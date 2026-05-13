import { comments } from "@situ/comments";
import { events } from "@situ/events";
import { notifications } from "@situ/notifications";
import { projects } from "@situ/projects";
import { tasks } from "@situ/tasks";

export const schema = {
  comments,
  events,
  notifications,
  projects,
  tasks,
};

export type AppSchema = typeof schema;
