import { Hono } from "hono";
import { z } from "zod";

import { baselineRepository } from "../data/repositories/baselines";
import { researchProjectInteractionRepository } from "../data/repositories/research-project-interactions";
import { researchProjectRepository } from "../data/repositories/research-projects";
import { jsonModule } from "../modules/json";
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
    payload: { source: "web", executionMode: "interactive" },
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
  const researchProject = await advanceAfterBaselineConfirmation({
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

async function advanceAfterBaselineConfirmation({
  interactionId,
  researchProjectId,
}: {
  interactionId: string;
  researchProjectId: string;
}) {
  const project = await researchProjectRepository.require({ researchProjectId });
  if (project.phase !== "baseline") {
    return project;
  }
  const interaction = await researchProjectInteractionRepository.require({ interactionId });
  if (interaction.kind !== "baseline_confirmation") {
    return project;
  }
  const payload = jsonModule.parseRecord({ raw: interaction.payloadJson });
  const baselineId = payload.baselineId;
  if (typeof baselineId !== "string" || !baselineId.trim()) {
    throw new Error(`Baseline confirmation is missing baselineId: ${interactionId}`);
  }
  const baseline = await baselineRepository.require({ baselineId });
  if (baseline.researchProjectId !== researchProjectId) {
    throw new Error(
      `Baseline ${baseline.id} does not belong to ResearchProject ${researchProjectId}.`,
    );
  }
  if (baseline.createdByResearchTaskId) {
    throw new Error(
      `Baseline confirmation requires a Manager-created project baseline: ${baseline.id}`,
    );
  }
  if (baseline.status !== "accepted") {
    await baselineRepository.accept({
      baselineId,
      actor: "user",
      comment: "Project baseline confirmed by user.",
    });
  }
  return researchProjectRepository.updatePhase({
    researchProjectId,
    phase: "search",
    baselineSummary: baseline.summary,
  });
}
