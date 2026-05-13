import type { LabelRecord } from "@situ/tasks";

import type { AppRepositories } from "./repositories";
import type { Clock, CreateLabelInput, IdFactory } from "./types";

export type CreateLabelActionInput = {
  createId: IdFactory;
  input: CreateLabelInput;
  now: Clock;
  repositories: AppRepositories;
};

/**
 * Creates a label.
 */
export const createLabelAction = ({
  createId,
  input,
  now,
  repositories,
}: CreateLabelActionInput): LabelRecord => {
  const timestamp = now();

  return repositories.tasks.createLabel({
    label: {
      id: input.id ?? createId("label"),
      name: input.name,
      color: input.color,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  });
};
