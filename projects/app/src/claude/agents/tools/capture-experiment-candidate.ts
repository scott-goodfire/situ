import { z } from "zod";

import { captureExperimentCandidate } from "../../../runtime/worktrees";
import { defineTool } from "./__shared__/define-tool";

const inputSchema = z.object({
  experimentId: z.string().describe("Experiment id to capture."),
  commitMessage: z.string().describe("Optional candidate commit message.").optional(),
});

export const captureExperimentCandidateTool = defineTool({
  name: "capture_experiment_candidate",
  description:
    "Commit changes in an experiment worktree, update candidate metadata, and record a patch artifact.",
  roles: ["scientist"],
  inputSchema,
  handler: async ({ input }) => ({
    candidate: await captureExperimentCandidate({
      experimentId: input.experimentId,
      commitMessage: input.commitMessage,
    }),
  }),
});
