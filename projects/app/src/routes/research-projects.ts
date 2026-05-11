import { Hono } from "hono";
import { z } from "zod";

import { researchProjectInteractionRepository } from "../data/repositories/research-project-interactions";
import { researchProjectRepository } from "../data/repositories/research-projects";
import { enqueueManagerResearchProjectWork } from "../runtime/dispatch";
import { hasAnthropicKey } from "../secrets/local-secret-store";
import { parseRouteBody } from "./__shared__/parse-route-body";

export const researchProjectRoutes = new Hono();

const createProjectBodySchema = z.object({
  goal: z.string().trim().min(1, "Research goal is required."),
});

const interactionResponseRequiredBodySchema = z.object({
  response: z.string().trim().min(1, "response is required"),
});

const interactionResponseOptionalBodySchema = z.object({
  response: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    }),
});

researchProjectRoutes.post("/research-projects", async (c) => {
  const body = await parseRouteBody({ context: c, schema: createProjectBodySchema });
  if (!body.ok) return body.response;

  const activeProject = await researchProjectRepository.findActive();
  if (activeProject) {
    return c.json(
      {
        error: "Research is already running. Finish the current project before starting a new one.",
        researchProject: activeProject,
      },
      409,
    );
  }

  const researchProject = await researchProjectRepository.create({
    goal: body.value.goal,
    payload: { source: "web" },
  });
  const enqueued = await enqueueIfConfigured({ researchProjectId: researchProject.id });
  return c.json({
    researchProject: await researchProjectRepository.require({
      researchProjectId: researchProject.id,
    }),
    enqueued,
  });
});

researchProjectRoutes.post("/research-project-interactions/:interactionId/answer", async (c) => {
  const interactionId = c.req.param("interactionId");
  const body = await parseRouteBody({
    context: c,
    schema: interactionResponseRequiredBodySchema,
  });
  if (!body.ok) return body.response;

  const interaction = await researchProjectInteractionRepository.transition({
    interactionId,
    status: "answered",
    response: body.value.response,
  });
  const enqueued = await enqueueForInteraction({ interaction });
  return c.json({
    interaction: await researchProjectInteractionRepository.require({ interactionId }),
    enqueued,
  });
});

researchProjectRoutes.post("/research-project-interactions/:interactionId/confirm", async (c) => {
  const interactionId = c.req.param("interactionId");
  const body = await parseRouteBody({
    context: c,
    schema: interactionResponseOptionalBodySchema,
  });
  if (!body.ok) return body.response;

  const interaction = await researchProjectInteractionRepository.transition({
    interactionId,
    status: "confirmed",
    response: body.value.response,
  });
  const researchProject = await advanceOnboardingAfterConfirmation({
    interactionId,
    researchProjectId: interaction.researchProjectId,
  });
  const enqueued = await enqueueForInteraction({ interaction });
  return c.json({
    researchProject,
    interaction: await researchProjectInteractionRepository.require({ interactionId }),
    enqueued,
  });
});

researchProjectRoutes.post("/research-project-interactions/:interactionId/reject", async (c) => {
  const interactionId = c.req.param("interactionId");
  const body = await parseRouteBody({
    context: c,
    schema: interactionResponseRequiredBodySchema,
  });
  if (!body.ok) return body.response;

  const interaction = await researchProjectInteractionRepository.transition({
    interactionId,
    status: "rejected",
    response: body.value.response,
  });
  const enqueued = await enqueueForInteraction({ interaction });
  return c.json({
    interaction: await researchProjectInteractionRepository.require({ interactionId }),
    enqueued,
  });
});

async function enqueueIfConfigured({
  researchProjectId,
}: {
  researchProjectId: string;
}): Promise<boolean> {
  if (!(await hasAnthropicKey())) {
    return false;
  }
  return (await enqueueManagerResearchProjectWork({ researchProjectId })) !== undefined;
}

async function enqueueForInteraction({
  interaction,
}: {
  interaction: { researchProjectId: string };
}): Promise<boolean> {
  return enqueueIfConfigured({ researchProjectId: interaction.researchProjectId });
}

async function advanceOnboardingAfterConfirmation({
  interactionId,
  researchProjectId,
}: {
  interactionId: string;
  researchProjectId: string;
}) {
  const project = await researchProjectRepository.require({ researchProjectId });
  if (project.phase !== "onboarding") {
    return project;
  }
  const interaction = await researchProjectInteractionRepository.require({ interactionId });
  return researchProjectRepository.updatePhase({
    researchProjectId,
    phase: "search",
    baselineSummary: interaction.details,
  });
}
