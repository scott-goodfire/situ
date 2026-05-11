import { asc, desc, eq } from "drizzle-orm";
import {
  RESEARCH_TASK_VERIFICATION_PROFILES,
  RESEARCH_TASK_VERIFICATION_STATUSES,
} from "@situ/protocol";

import { getDb } from "../../db/client";
import { researchTaskVerifications } from "../../db/schema";
import { runSyncedWrite } from "../../db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import { textModule } from "../../../modules/text";
import { clampRepositoryLimit, matchesRepositorySearch, PreconditionError } from "../__shared__";
import { researchTaskRepository, type ResearchTaskStatus } from "../research-tasks";

export type ResearchTaskVerificationRecord = typeof researchTaskVerifications.$inferSelect;
export type ResearchTaskVerificationProfile = ResearchTaskVerificationRecord["profile"];
export type ResearchTaskVerificationStatus = ResearchTaskVerificationRecord["status"];

const researchTaskVerificationProfiles = new Set<ResearchTaskVerificationProfile>(
  RESEARCH_TASK_VERIFICATION_PROFILES,
);
const researchTaskVerificationStatuses = new Set<ResearchTaskVerificationStatus>(
  RESEARCH_TASK_VERIFICATION_STATUSES,
);

export const researchTaskVerificationRepository = {
  async create({
    researchTaskId,
    status,
    verifierPrompt,
    judgment,
    evidenceSummary = "",
    profile = "general",
    payload = {},
    createdByAgentId,
  }: {
    researchTaskId: string;
    status: ResearchTaskVerificationStatus;
    verifierPrompt: string;
    judgment: string;
    evidenceSummary?: string;
    profile?: ResearchTaskVerificationProfile;
    payload?: Record<string, unknown>;
    createdByAgentId?: string;
  }): Promise<ResearchTaskVerificationRecord> {
    assertVerificationProfile({ profile });
    assertVerificationStatus({ status });
    const task = await researchTaskRepository.require({ researchTaskId });
    assertResearchTaskCanBeVerified({ status: task.status, researchTaskId });
    assertPassedVerificationHasEvidence({ status, evidenceSummary });
    const verificationId = crypto.randomUUID();
    const now = dateTimeModule.nowIso();
    const trimmedEvidenceSummary = evidenceSummary.trim();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(researchTaskVerifications)
          .values({
            id: verificationId,
            researchTaskId,
            profile,
            status,
            verifierPrompt: textModule.requiredText({
              value: verifierPrompt,
              label: "verifierPrompt",
            }),
            judgment: textModule.requiredText({ value: judgment, label: "judgment" }),
            evidenceSummary: trimmedEvidenceSummary,
            createdByAgentId,
            payloadJson: JSON.stringify(payload),
            syncVersion,
            syncDeleted: false,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      },
    });
    await researchTaskRepository.transition({
      researchTaskId,
      status: researchTaskStatusForVerificationStatus({ status }),
      resultSummary: judgment,
    });
    return researchTaskVerificationRepository.require({ verificationId });
  },

  async get({
    verificationId,
  }: {
    verificationId: string;
  }): Promise<ResearchTaskVerificationRecord | undefined> {
    return getDb().query.researchTaskVerifications.findFirst({
      where: eq(researchTaskVerifications.id, verificationId),
    });
  },

  async require({
    verificationId,
  }: {
    verificationId: string;
  }): Promise<ResearchTaskVerificationRecord> {
    const verification = await researchTaskVerificationRepository.get({ verificationId });
    if (!verification) {
      throw new PreconditionError({
        code: "research_task_verification_not_found",
        hint: "List or search ResearchTaskVerifications; this id may be abbreviated or stale.",
        details: { verificationId },
      });
    }
    return verification;
  },

  async list({ limit = 20 }: { limit?: number } = {}): Promise<ResearchTaskVerificationRecord[]> {
    const rows = await getDb()
      .select()
      .from(researchTaskVerifications)
      .orderBy(desc(researchTaskVerifications.createdAt), desc(researchTaskVerifications.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async listByResearchTask({
    researchTaskId,
    limit = 20,
  }: {
    researchTaskId: string;
    limit?: number;
  }): Promise<ResearchTaskVerificationRecord[]> {
    const rows = await getDb()
      .select()
      .from(researchTaskVerifications)
      .where(eq(researchTaskVerifications.researchTaskId, researchTaskId))
      .orderBy(asc(researchTaskVerifications.createdAt), asc(researchTaskVerifications.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async search({
    query,
    status,
    profile,
    limit = 20,
  }: {
    query?: string;
    status?: ResearchTaskVerificationStatus;
    profile?: ResearchTaskVerificationProfile;
    limit?: number;
  } = {}): Promise<ResearchTaskVerificationRecord[]> {
    if (status) {
      assertVerificationStatus({ status });
    }
    if (profile) {
      assertVerificationProfile({ profile });
    }
    const rows = await researchTaskVerificationRepository.list({ limit: 200 });
    const filtered = rows.filter((verification) => {
      if (status && verification.status !== status) {
        return false;
      }
      if (profile && verification.profile !== profile) {
        return false;
      }
      return matchesRepositorySearch({
        query,
        values: [
          verification.id,
          verification.researchTaskId,
          verification.profile,
          verification.status,
          verification.verifierPrompt,
          verification.judgment,
          verification.evidenceSummary,
        ],
      });
    });
    return filtered.slice(0, clampRepositoryLimit({ limit }));
  },
};

function assertVerificationProfile(input: { profile: string }): asserts input is {
  profile: ResearchTaskVerificationProfile;
} {
  if (!researchTaskVerificationProfiles.has(input.profile as ResearchTaskVerificationProfile)) {
    throw new PreconditionError({
      code: "research_task_verification_invalid_profile",
      hint: "Use a profile from RESEARCH_TASK_VERIFICATION_PROFILES.",
      details: { profile: input.profile, allowed: Array.from(researchTaskVerificationProfiles) },
    });
  }
}

function assertVerificationStatus(input: { status: string }): asserts input is {
  status: ResearchTaskVerificationStatus;
} {
  if (!researchTaskVerificationStatuses.has(input.status as ResearchTaskVerificationStatus)) {
    throw new PreconditionError({
      code: "research_task_verification_invalid_status",
      hint: "Use a status from RESEARCH_TASK_VERIFICATION_STATUSES.",
      details: { status: input.status, allowed: Array.from(researchTaskVerificationStatuses) },
    });
  }
}

function assertResearchTaskCanBeVerified({
  status,
  researchTaskId,
}: {
  status: ResearchTaskStatus;
  researchTaskId: string;
}): void {
  if (status !== "awaiting_verification") {
    throw new PreconditionError({
      code: "research_task_not_awaiting_verification",
      hint: "Submit the ResearchTask for verification (transition to awaiting_verification) before creating a verification.",
      details: { researchTaskId, currentStatus: status, requiredStatus: "awaiting_verification" },
    });
  }
}

function assertPassedVerificationHasEvidence({
  status,
  evidenceSummary,
}: {
  status: ResearchTaskVerificationStatus;
  evidenceSummary: string;
}): void {
  if (status === "passed" && evidenceSummary.trim().length === 0) {
    throw new PreconditionError({
      code: "research_task_verification_evidence_required",
      hint: "Provide a non-empty evidenceSummary when marking a verification as passed.",
      details: { status },
    });
  }
}

function researchTaskStatusForVerificationStatus({
  status,
}: {
  status: ResearchTaskVerificationStatus;
}): ResearchTaskStatus {
  if (status === "passed") {
    return "verified";
  }
  if (status === "needs_more_evidence") {
    return "planned";
  }
  return "rejected";
}
