import type { Meta, StoryObj } from "@storybook/react-vite";
import { DateTime } from "luxon";
import {
  ENTITY_LINK_FIXTURES,
  EVALUATION_FIXTURES,
  EXPERIMENT_FIXTURES,
  HYPOTHESIS_FIXTURES,
  MEASUREMENT_FIXTURES,
  RESEARCH_PROJECT_FIXTURES,
  RESEARCH_TASK_FIXTURES,
  RESEARCH_TASK_VERIFICATION_FIXTURES,
} from "../../fixtures";
import type {
  EntityLinkRecord,
  EvaluationRecord,
  ExperimentRecord,
  HypothesisRecord,
  MeasurementRecord,
  ResearchProjectRecord,
  ResearchProjectStatus,
  ResearchStatus,
  ResearchTaskRecord,
  ResearchTaskVerificationRecord,
  ResearchTaskVerificationStatus,
  Timestamp,
} from "../../domain/records";
import type { BuildResearchMapModelInput } from "./research-map-model";
import { ResearchMapView } from "./research-map-view";

const STORY_NOW: Timestamp = "2026-05-10T18:00:00.000Z";

function minBefore(minutes: number): Timestamp {
  const dt = DateTime.fromISO(STORY_NOW, { zone: "utc" }).minus({ minutes });
  const iso = dt.toISO();
  if (iso === null) {
    throw new Error("story builder produced invalid ISO");
  }
  return iso;
}

function hourBefore(hours: number): Timestamp {
  return minBefore(hours * 60);
}

type SpecExperiment = StorySpec["experiments"][number];

type SpreadPlan = {
  hypothesisId: string;
  startMinutesAgo: number;
  endMinutesAgo: number;
  variants: Array<{
    title: string;
    summary: string;
    status?: ResearchStatus;
    verificationStatus?: ResearchTaskVerificationStatus;
    evaluationCount?: number;
    measurementCount?: number;
    forkFromIndex?: number;
    parentExperimentId?: string;
  }>;
};

function spreadExperiments(idPrefix: string, plan: SpreadPlan): SpecExperiment[] {
  const { hypothesisId, startMinutesAgo, endMinutesAgo, variants } = plan;
  const span = startMinutesAgo - endMinutesAgo;
  const step = variants.length > 1 ? span / (variants.length - 1) : 0;
  const built: SpecExperiment[] = variants.map((variant, index) => {
    const id = `${idPrefix}_${index + 1}`;
    const createdMinutesAgo = Math.round(startMinutesAgo - step * index);
    const parentExperimentId =
      variant.parentExperimentId ??
      (variant.forkFromIndex !== undefined
        ? `${idPrefix}_${variant.forkFromIndex + 1}`
        : undefined);
    return {
      id,
      hypothesisId,
      parentExperimentId,
      title: variant.title,
      summary: variant.summary,
      status: variant.status ?? "active",
      createdMinutesAgo,
      verificationStatus: variant.verificationStatus,
      evaluationCount: variant.evaluationCount,
      measurementCount: variant.measurementCount,
    };
  });
  return built;
}

type StorySpec = {
  projectId: string;
  projectTitle: string;
  projectStartedMinutesAgo: number;
  projectFinishedMinutesAgo?: number;
  projectStatus?: ResearchProjectStatus;
  projectReportSummary?: string;
  hypotheses: Array<{
    id: string;
    title: string;
    summary: string;
    status: ResearchStatus;
    createdMinutesAgo: number;
  }>;
  experiments: Array<{
    id: string;
    hypothesisId: string;
    parentExperimentId?: string | null;
    title: string;
    summary: string;
    status: ResearchStatus;
    createdMinutesAgo: number;
    verificationStatus?: ResearchTaskVerificationStatus;
    evaluationCount?: number;
    measurementCount?: number;
  }>;
};

function inputFromSpec(spec: StorySpec): BuildResearchMapModelInput {
  const projectStatus: ResearchProjectStatus =
    spec.projectStatus ??
    (spec.projectFinishedMinutesAgo !== undefined ? "complete" : "researching");
  const projectUpdatedAt: Timestamp =
    spec.projectFinishedMinutesAgo !== undefined
      ? minBefore(spec.projectFinishedMinutesAgo)
      : STORY_NOW;
  const project: ResearchProjectRecord = {
    id: spec.projectId,
    title: spec.projectTitle,
    goal: spec.projectTitle,
    status: projectStatus,
    baselineSummary: null,
    currentDecision: null,
    reportSummary: spec.projectReportSummary ?? null,
    createdAt: minBefore(spec.projectStartedMinutesAgo),
    updatedAt: projectUpdatedAt,
  };

  const hypotheses: HypothesisRecord[] = spec.hypotheses.map((h) => ({
    id: h.id,
    createdByResearchTaskId: null,
    createdByAgentId: null,
    title: h.title,
    summary: h.summary,
    status: h.status,
    createdAt: minBefore(h.createdMinutesAgo),
    updatedAt: minBefore(Math.max(h.createdMinutesAgo - 1, 0)),
  }));

  const researchTasks: ResearchTaskRecord[] = spec.experiments.map((e) => ({
    id: `tsk_${e.id}`,
    projectId: spec.projectId,
    parentResearchTaskId: null,
    type: "exploit",
    title: `Run ${e.title}`,
    summary: e.summary,
    workerPrompt: e.summary,
    verificationPrompt: `Verify ${e.title}`,
    status: e.verificationStatus === "pass" ? "verified" : "running",
    priority: "normal",
    hypothesisId: e.hypothesisId,
    evidenceCount: (e.evaluationCount ?? 0) + (e.measurementCount ?? 0),
    createdAt: minBefore(e.createdMinutesAgo),
    updatedAt: minBefore(Math.max(e.createdMinutesAgo - 1, 0)),
  }));

  const experiments: ExperimentRecord[] = spec.experiments.map((e) => ({
    id: e.id,
    createdByResearchTaskId: `tsk_${e.id}`,
    createdByAgentId: null,
    associatedHypothesisId: e.hypothesisId,
    parentExperimentId: e.parentExperimentId ?? null,
    title: e.title,
    summary: e.summary,
    status: e.status,
    worktreePath: null,
    baseCommit: null,
    candidateCommit: null,
    createdAt: minBefore(e.createdMinutesAgo),
    updatedAt: minBefore(Math.max(e.createdMinutesAgo - 1, 0)),
  }));

  const entityLinks: EntityLinkRecord[] = spec.experiments.map((e, index) => ({
    id: `lnk_${index}`,
    fromKind: "hypothesis",
    fromId: e.hypothesisId,
    toKind: "experiment",
    toId: e.id,
    relationship: "tested-by",
    createdAt: minBefore(e.createdMinutesAgo),
  }));

  const verifications: ResearchTaskVerificationRecord[] = spec.experiments
    .filter((e) => e.verificationStatus !== undefined)
    .map((e) => ({
      id: `rtv_${e.id}`,
      researchTaskId: `tsk_${e.id}`,
      status: e.verificationStatus as ResearchTaskVerificationStatus,
      verifier: "Verifier",
      summary: `Outcome for ${e.title}`,
      evidence: [],
      createdAt: minBefore(Math.max(e.createdMinutesAgo - 2, 0)),
      updatedAt: minBefore(Math.max(e.createdMinutesAgo - 2, 0)),
    }));

  const evaluations: EvaluationRecord[] = spec.experiments.flatMap((e) =>
    Array.from({ length: e.evaluationCount ?? 0 }, (_, index) => ({
      id: `evl_${e.id}_${index}`,
      createdByResearchTaskId: `tsk_${e.id}`,
      createdByAgentId: null,
      associatedBaselineId: null,
      associatedExperimentId: e.id,
      title: `Evaluation ${index + 1} for ${e.title}`,
      summary: `Evaluation ${index + 1}`,
      status: "done" as ResearchStatus,
      createdAt: minBefore(Math.max(e.createdMinutesAgo - 1, 0)),
      updatedAt: minBefore(Math.max(e.createdMinutesAgo - 1, 0)),
    })),
  );

  const measurements: MeasurementRecord[] = evaluations.flatMap((evaluation, index) => {
    const owningExperiment = spec.experiments.find(
      (e) => evaluation.id === `evl_${e.id}_${index % Math.max(e.evaluationCount ?? 1, 1)}`,
    );
    const count = owningExperiment?.measurementCount ?? 0;
    return Array.from({ length: count }, (_, mIndex) => ({
      id: `msr_${evaluation.id}_${mIndex}`,
      createdByResearchTaskId: evaluation.createdByResearchTaskId,
      createdByAgentId: null,
      evaluationId: evaluation.id,
      actor: "scientist",
      body: `Measurement ${mIndex + 1}`,
      payload: {},
      createdAt: evaluation.createdAt,
    }));
  });

  return {
    project,
    hypotheses,
    experiments,
    entityLinks,
    researchTasks,
    verifications,
    evaluations,
    measurements,
    now: STORY_NOW,
  };
}

const meta: Meta<typeof ResearchMapView> = {
  title: "App UI/Research Map View",
  component: ResearchMapView,
};

export default meta;

type Story = StoryObj<typeof ResearchMapView>;

export const JustStarted: Story = {
  name: "Just started (~12 min, no experiments yet)",
  args: {
    input: inputFromSpec({
      projectId: "rpj_just_started",
      projectTitle: "Why is the manager dispatcher idle for 30s after restart?",
      projectStartedMinutesAgo: 12,
      hypotheses: [
        {
          id: "h_just_1",
          title: "Scheduler waits for the lease sweeper to seed first",
          summary:
            "The dispatcher waits for the lease sweep job to claim its first cycle before issuing work.",
          status: "active",
          createdMinutesAgo: 4,
        },
      ],
      experiments: [],
    }),
  },
};

export const HourIn: Story = {
  name: "Hour in (~1h, first experiments running)",
  args: {
    input: inputFromSpec({
      projectId: "rpj_hour_in",
      projectTitle: "Replicache pull latency P95 doubled after the schema migration",
      projectStartedMinutesAgo: 68,
      hypotheses: [
        {
          id: "h_hour_1",
          title: "New sync_version index is missing on a hot key prefix",
          summary: "A missing index forces a full scan on every pull.",
          status: "active",
          createdMinutesAgo: 56,
        },
        {
          id: "h_hour_2",
          title: "Patch builder allocates a Map per row instead of per pull",
          summary: "Per-row allocations dominate the pull handler.",
          status: "active",
          createdMinutesAgo: 38,
        },
      ],
      experiments: [
        {
          id: "e_hour_1",
          hypothesisId: "h_hour_1",
          title: "Add covering index on sync_version",
          summary: "Apply CREATE INDEX, re-run the pull benchmark.",
          status: "active",
          createdMinutesAgo: 42,
          evaluationCount: 1,
        },
        {
          id: "e_hour_2",
          hypothesisId: "h_hour_2",
          title: "Reuse a single patch buffer per pull",
          summary: "Hoist the patch buffer to pull scope.",
          status: "active",
          createdMinutesAgo: 22,
        },
        {
          id: "e_hour_3",
          hypothesisId: "h_hour_1",
          parentExperimentId: "e_hour_1",
          title: "Index + EXPLAIN regression check",
          summary: "Confirm planner picks the new index for hot pulls.",
          status: "active",
          createdMinutesAgo: 8,
        },
      ],
    }),
  },
};

export const MidCycle: Story = {
  name: "Mid cycle (~12h, dense forking)",
  args: {
    input: inputFromSpec({
      projectId: "rpj_mid",
      projectTitle: "Verifier acceptance rate dropped from 92% to 71% over the weekend",
      projectStartedMinutesAgo: 11 * 60 + 30,
      hypotheses: [
        {
          id: "h_mid_1",
          title: "Verifier runtime skill regressed when we trimmed the marker list",
          summary: "Trimming required markers may have made the rubric too strict.",
          status: "active",
          createdMinutesAgo: 11 * 60,
        },
        {
          id: "h_mid_2",
          title: "Scientist evidence summaries got shorter",
          summary: "If summaries shrank, the verifier has less to ground its judgment in.",
          status: "in_review",
          createdMinutesAgo: 10 * 60,
        },
        {
          id: "h_mid_3",
          title: "Concurrent verifier runs share a stale evaluation cache",
          summary: "Parallel verifiers may be reading stale eval lookups.",
          status: "active",
          createdMinutesAgo: 8 * 60,
        },
        {
          id: "h_mid_4",
          title: "Manager retry budget masks early Scientist failures",
          summary: "If retries hide failures, evidence reaching the verifier is misleading.",
          status: "done",
          createdMinutesAgo: 7 * 60,
        },
        {
          id: "h_mid_5",
          title: "Tool change in source-workspace altered file truncation",
          summary: "A subtle truncation could be cutting evidence mid-sentence.",
          status: "failed",
          createdMinutesAgo: 5 * 60,
        },
      ],
      experiments: [
        {
          id: "e_mid_1",
          hypothesisId: "h_mid_1",
          title: "Restore prior marker list",
          summary: "Roll the marker rubric back to the pre-change list.",
          status: "done",
          createdMinutesAgo: 10 * 60 + 30,
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 4,
        },
        {
          id: "e_mid_2",
          hypothesisId: "h_mid_1",
          parentExperimentId: "e_mid_1",
          title: "Restored markers + relaxed thresholds",
          summary: "Combine restored markers with a softer pass threshold.",
          status: "active",
          createdMinutesAgo: 6 * 60,
          evaluationCount: 1,
        },
        {
          id: "e_mid_3",
          hypothesisId: "h_mid_2",
          title: "Length-bucketed verifier eval",
          summary: "Score verifier on short vs long summaries separately.",
          status: "in_review",
          createdMinutesAgo: 9 * 60,
          verificationStatus: "needs_more_evidence",
          evaluationCount: 1,
        },
        {
          id: "e_mid_4",
          hypothesisId: "h_mid_2",
          parentExperimentId: "e_mid_3",
          title: "Force minimum summary length",
          summary: "Require Scientist to produce >300 chars of evidence.",
          status: "in_review",
          createdMinutesAgo: 4 * 60 + 20,
          verificationStatus: "suspicious",
          evaluationCount: 1,
        },
        {
          id: "e_mid_5",
          hypothesisId: "h_mid_3",
          title: "Cache-bypass verifier",
          summary: "Skip the eval cache for verifier reads.",
          status: "active",
          createdMinutesAgo: 7 * 60 + 40,
          evaluationCount: 1,
        },
        {
          id: "e_mid_6",
          hypothesisId: "h_mid_3",
          parentExperimentId: "e_mid_5",
          title: "Cache-bypass + per-run TTL",
          summary: "Bypass cache and add a 60s TTL.",
          status: "active",
          createdMinutesAgo: 3 * 60 + 10,
        },
        {
          id: "e_mid_7",
          hypothesisId: "h_mid_4",
          title: "Drop retry budget to 1",
          summary: "Surface Scientist failures immediately.",
          status: "done",
          createdMinutesAgo: 6 * 60 + 30,
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 3,
        },
        {
          id: "e_mid_8",
          hypothesisId: "h_mid_5",
          title: "Restore tool truncation behavior",
          summary: "Roll source-workspace truncation back.",
          status: "failed",
          createdMinutesAgo: 4 * 60 + 50,
          verificationStatus: "fail",
          evaluationCount: 1,
        },
        {
          id: "e_mid_9",
          hypothesisId: "h_mid_5",
          parentExperimentId: "e_mid_8",
          title: "Truncation + summary length floor",
          summary: "Combine prior fixes.",
          status: "failed",
          createdMinutesAgo: 2 * 60 + 30,
          verificationStatus: "fail",
        },
        {
          id: "e_mid_10",
          hypothesisId: "h_mid_1",
          parentExperimentId: "e_mid_2",
          title: "Restored markers + per-role thresholds",
          summary: "Tune thresholds per agent role.",
          status: "active",
          createdMinutesAgo: 90,
          evaluationCount: 1,
        },
        {
          id: "e_mid_11",
          hypothesisId: "h_mid_3",
          parentExperimentId: "e_mid_6",
          title: "Cache-bypass + admission control",
          summary: "Bypass + pre-warm admission.",
          status: "active",
          createdMinutesAgo: 35,
        },
      ],
    }),
  },
};

export const Completed: Story = {
  name: "Completed (~22h total, finished 1h ago)",
  args: {
    input: inputFromSpec({
      projectId: "rpj_completed",
      projectTitle: "Cut the verifier P95 from 12s to under 5s",
      projectStartedMinutesAgo: 22 * 60 + 40,
      projectFinishedMinutesAgo: 60,
      projectStatus: "complete",
      projectReportSummary:
        "Switching the verifier to a per-task evidence cache cut P95 from 12s to 4.2s with no accuracy regression.",
      hypotheses: [
        {
          id: "h_done_1",
          title: "Per-task evidence cache amortizes verifier reads",
          summary: "A per-task cache turns N eval lookups into 1 read per task.",
          status: "done",
          createdMinutesAgo: 22 * 60,
        },
        {
          id: "h_done_2",
          title: "Verifier prompt size dominates token cost",
          summary: "Token cost may be more about prompt length than tool calls.",
          status: "done",
          createdMinutesAgo: 18 * 60,
        },
        {
          id: "h_done_3",
          title: "Concurrent verifiers contend on the same DB connection",
          summary: "Connection pool may be saturating under burst.",
          status: "failed",
          createdMinutesAgo: 14 * 60,
        },
        {
          id: "h_done_4",
          title: "Stale evaluation rows pollute the verifier context",
          summary: "Old eval rows may be confusing the verifier.",
          status: "canceled",
          createdMinutesAgo: 9 * 60,
        },
      ],
      experiments: [
        {
          id: "e_done_1",
          hypothesisId: "h_done_1",
          title: "Per-task cache prototype",
          summary: "Wrap evidence reads in a per-task cache.",
          status: "done",
          createdMinutesAgo: 21 * 60,
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 4,
        },
        {
          id: "e_done_2",
          hypothesisId: "h_done_1",
          parentExperimentId: "e_done_1",
          title: "Per-task cache + read-through",
          summary: "Pull through cache misses.",
          status: "done",
          createdMinutesAgo: 17 * 60,
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 6,
        },
        {
          id: "e_done_3",
          hypothesisId: "h_done_1",
          parentExperimentId: "e_done_2",
          title: "Per-task cache + bounded TTL",
          summary: "Add a 30s TTL to bound staleness.",
          status: "done",
          createdMinutesAgo: 5 * 60,
          verificationStatus: "pass",
          evaluationCount: 3,
          measurementCount: 8,
        },
        {
          id: "e_done_4",
          hypothesisId: "h_done_2",
          title: "Drop background context section",
          summary: "Trim 800 tokens of background prompt.",
          status: "done",
          createdMinutesAgo: 16 * 60,
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 2,
        },
        {
          id: "e_done_5",
          hypothesisId: "h_done_2",
          parentExperimentId: "e_done_4",
          title: "Trim + structured evidence section",
          summary: "Replace prose evidence with structured bullets.",
          status: "done",
          createdMinutesAgo: 11 * 60,
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 3,
        },
        {
          id: "e_done_6",
          hypothesisId: "h_done_3",
          title: "Bump pool to 16 connections",
          summary: "Raise the DB connection ceiling.",
          status: "failed",
          createdMinutesAgo: 13 * 60,
          verificationStatus: "fail",
          evaluationCount: 1,
        },
        {
          id: "e_done_7",
          hypothesisId: "h_done_3",
          parentExperimentId: "e_done_6",
          title: "Pool=16 + queue overflow guard",
          summary: "Raise pool, add a queue with overflow handling.",
          status: "failed",
          createdMinutesAgo: 8 * 60,
          verificationStatus: "fail",
        },
        {
          id: "e_done_8",
          hypothesisId: "h_done_4",
          title: "Filter eval rows older than 24h",
          summary: "Skip stale eval rows in the verifier read.",
          status: "done",
          createdMinutesAgo: 7 * 60,
          verificationStatus: "needs_more_evidence",
          evaluationCount: 1,
        },
      ],
    }),
  },
};

export const ShortRun: Story = {
  name: "Short run (~30 min)",
  args: {
    input: inputFromSpec({
      projectId: "rpj_short",
      projectTitle: "Why did P95 spike at 17:42?",
      projectStartedMinutesAgo: 28,
      hypotheses: [
        {
          id: "h_short_1",
          title: "Cache TTL bump regressed cold-start latency",
          summary: "Bumping the prompt cache TTL increased cold-start time on rare paths.",
          status: "active",
          createdMinutesAgo: 26,
        },
        {
          id: "h_short_2",
          title: "Concurrent worktrees serialize on git lock",
          summary: "Three worker branches are blocked behind a shared lock.",
          status: "in_review",
          createdMinutesAgo: 22,
        },
      ],
      experiments: [
        {
          id: "e_short_1",
          hypothesisId: "h_short_1",
          title: "TTL=20m baseline",
          summary: "Baseline measurement on 200 traces.",
          status: "done",
          createdMinutesAgo: 20,
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 2,
        },
        {
          id: "e_short_2",
          hypothesisId: "h_short_1",
          parentExperimentId: "e_short_1",
          title: "TTL=20m + cold-start guard",
          summary: "Prewarm cache on cold paths.",
          status: "active",
          createdMinutesAgo: 8,
          evaluationCount: 1,
        },
        {
          id: "e_short_3",
          hypothesisId: "h_short_2",
          title: "Worktree=3 sanity",
          summary: "Three worktrees on dummy workload.",
          status: "active",
          createdMinutesAgo: 12,
        },
      ],
    }),
  },
};

export const Typical: Story = {
  name: "Typical run (~6 h)",
  args: {
    input: inputFromSpec({
      projectId: "rpj_typical",
      projectTitle: "Verify the new memo cache rollout",
      projectStartedMinutesAgo: 5 * 60 + 40,
      hypotheses: [
        {
          id: "h_typ_1",
          title: "Memo cache reduces P50 by 20%",
          summary: "Memoization on tool dispatch should cut median latency.",
          status: "active",
          createdMinutesAgo: 5 * 60 + 20,
        },
        {
          id: "h_typ_2",
          title: "Cache fairness holds across tenants",
          summary: "No tenant should starve under high-cache turnover.",
          status: "active",
          createdMinutesAgo: 4 * 60 + 30,
        },
        {
          id: "h_typ_3",
          title: "Eviction policy is sane",
          summary: "LRU should not drop hot keys under burst load.",
          status: "in_review",
          createdMinutesAgo: 3 * 60,
        },
        {
          id: "h_typ_4",
          title: "Worker count above 8 saturates SQLite",
          summary: "Write throughput drops when writers exceed pool size.",
          status: "failed",
          createdMinutesAgo: 5 * 60,
        },
      ],
      experiments: [
        {
          id: "e_typ_1",
          hypothesisId: "h_typ_1",
          title: "Memoize dispatch",
          summary: "Wrap dispatch with LRU memoize.",
          status: "done",
          createdMinutesAgo: 5 * 60,
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 4,
        },
        {
          id: "e_typ_2",
          hypothesisId: "h_typ_1",
          parentExperimentId: "e_typ_1",
          title: "Memoize + tag",
          summary: "Memoize keyed by tool tag.",
          status: "active",
          createdMinutesAgo: 3 * 60,
          evaluationCount: 1,
        },
        {
          id: "e_typ_3",
          hypothesisId: "h_typ_2",
          title: "Tenant fairness probe",
          summary: "Run two tenants in parallel.",
          status: "in_review",
          createdMinutesAgo: 4 * 60,
          verificationStatus: "needs_more_evidence",
          evaluationCount: 1,
        },
        {
          id: "e_typ_4",
          hypothesisId: "h_typ_3",
          title: "LRU under burst",
          summary: "100x burst with 50% repeated keys.",
          status: "in_review",
          createdMinutesAgo: 2 * 60 + 20,
          verificationStatus: "suspicious",
        },
        {
          id: "e_typ_5",
          hypothesisId: "h_typ_4",
          title: "Writers=12 stress",
          summary: "Drive 12 concurrent SQLite writers.",
          status: "failed",
          createdMinutesAgo: 4 * 60 + 30,
          verificationStatus: "fail",
        },
        {
          id: "e_typ_6",
          hypothesisId: "h_typ_3",
          parentExperimentId: "e_typ_4",
          title: "LRU + admission",
          summary: "Add admission control before LRU.",
          status: "active",
          createdMinutesAgo: 60,
        },
      ],
    }),
  },
};

export const LongRun: Story = {
  name: "Long run (~24 h)",
  args: {
    input: inputFromSpec({
      projectId: "rpj_long",
      projectTitle: "End-to-end pipeline regression hunt",
      projectStartedMinutesAgo: 22 * 60,
      hypotheses: [
        {
          id: "h_long_1",
          title: "Tool retries past 3 indicate a deterministic failure",
          summary: "Retry loops mask permanent errors.",
          status: "active",
          createdMinutesAgo: 21 * 60,
        },
        {
          id: "h_long_2",
          title: "Verifier ignores low-evidence baselines",
          summary: "Sparse baselines are scored too high.",
          status: "in_review",
          createdMinutesAgo: 18 * 60,
        },
        {
          id: "h_long_3",
          title: "Concurrent worktrees do not contend on git",
          summary: "Three worktrees on independent paths.",
          status: "done",
          createdMinutesAgo: 19 * 60,
        },
        {
          id: "h_long_4",
          title: "Sandbox overhead is sub-5%",
          summary: "Read-only sandbox keeps latency budget.",
          status: "active",
          createdMinutesAgo: 14 * 60,
        },
        {
          id: "h_long_5",
          title: "Cache hit rate >5% improves throughput",
          summary: "Cache TTL bump should compound on repeat calls.",
          status: "failed",
          createdMinutesAgo: 12 * 60,
        },
      ],
      experiments: [
        {
          id: "e_long_1",
          hypothesisId: "h_long_1",
          title: "Cap retries at 3",
          summary: "Hard cap; surface error.",
          status: "done",
          createdMinutesAgo: 20 * 60,
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 2,
        },
        {
          id: "e_long_2",
          hypothesisId: "h_long_1",
          parentExperimentId: "e_long_1",
          title: "Cap + classify",
          summary: "Cap retries and classify the error.",
          status: "active",
          createdMinutesAgo: 6 * 60,
        },
        {
          id: "e_long_3",
          hypothesisId: "h_long_2",
          title: "Score sparser baselines lower",
          summary: "Penalize <3 measurements.",
          status: "in_review",
          createdMinutesAgo: 16 * 60,
          verificationStatus: "suspicious",
          evaluationCount: 1,
        },
        {
          id: "e_long_4",
          hypothesisId: "h_long_3",
          title: "Worktree=3 long burn",
          summary: "12h burn-in.",
          status: "done",
          createdMinutesAgo: 18 * 60,
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 4,
        },
        {
          id: "e_long_5",
          hypothesisId: "h_long_4",
          title: "Sandbox on/off split",
          summary: "Compare sandboxed vs raw bash.",
          status: "active",
          createdMinutesAgo: 10 * 60,
          evaluationCount: 1,
        },
        {
          id: "e_long_6",
          hypothesisId: "h_long_5",
          title: "TTL=20m on cold paths",
          summary: "Bump TTL on cold paths only.",
          status: "failed",
          createdMinutesAgo: 11 * 60,
          verificationStatus: "fail",
        },
        {
          id: "e_long_7",
          hypothesisId: "h_long_4",
          parentExperimentId: "e_long_5",
          title: "Sandbox + cache primer",
          summary: "Combine sandbox and primer.",
          status: "active",
          createdMinutesAgo: 4 * 60,
          evaluationCount: 1,
        },
      ],
    }),
  },
};

export const DenseCluster: Story = {
  name: "Dense cluster (label collision)",
  args: {
    input: inputFromSpec({
      projectId: "rpj_dense",
      projectTitle: "Cluster of related tries against a single hypothesis",
      projectStartedMinutesAgo: 90,
      hypotheses: [
        {
          id: "h_dense_1",
          title: "Cache hit improves throughput",
          summary: "Many configurations probed quickly.",
          status: "active",
          createdMinutesAgo: 80,
        },
      ],
      experiments: [
        {
          id: "e_dense_1",
          hypothesisId: "h_dense_1",
          title: "TTL=5m",
          summary: "Five-minute TTL",
          status: "done",
          createdMinutesAgo: 60,
          verificationStatus: "pass",
          evaluationCount: 1,
        },
        {
          id: "e_dense_2",
          hypothesisId: "h_dense_1",
          parentExperimentId: "e_dense_1",
          title: "TTL=10m",
          summary: "Ten-minute TTL",
          status: "done",
          createdMinutesAgo: 56,
          verificationStatus: "pass",
          evaluationCount: 1,
        },
        {
          id: "e_dense_3",
          hypothesisId: "h_dense_1",
          parentExperimentId: "e_dense_2",
          title: "TTL=20m",
          summary: "Twenty-minute TTL",
          status: "done",
          createdMinutesAgo: 52,
          verificationStatus: "pass",
          evaluationCount: 1,
        },
        {
          id: "e_dense_4",
          hypothesisId: "h_dense_1",
          parentExperimentId: "e_dense_3",
          title: "TTL=30m",
          summary: "Thirty-minute TTL",
          status: "active",
          createdMinutesAgo: 48,
        },
        {
          id: "e_dense_5",
          hypothesisId: "h_dense_1",
          parentExperimentId: "e_dense_4",
          title: "TTL=45m",
          summary: "Forty-five-minute TTL",
          status: "active",
          createdMinutesAgo: 44,
        },
        {
          id: "e_dense_6",
          hypothesisId: "h_dense_1",
          parentExperimentId: "e_dense_5",
          title: "TTL=60m",
          summary: "One-hour TTL",
          status: "active",
          createdMinutesAgo: 40,
        },
      ],
    }),
  },
};

export const AllFailed: Story = {
  name: "All failed",
  args: {
    input: inputFromSpec({
      projectId: "rpj_failed",
      projectTitle: "Hypotheses ruled out",
      projectStartedMinutesAgo: 4 * 60,
      hypotheses: [
        {
          id: "h_fail_1",
          title: "Tighter retry loop fixes the latency tail",
          summary: "Reducing retry budget.",
          status: "failed",
          createdMinutesAgo: 3 * 60 + 50,
        },
        {
          id: "h_fail_2",
          title: "Cache prewarm covers cold paths",
          summary: "Background prewarm task.",
          status: "failed",
          createdMinutesAgo: 3 * 60,
        },
      ],
      experiments: [
        {
          id: "e_fail_1",
          hypothesisId: "h_fail_1",
          title: "Retry budget=1",
          summary: "Only one retry.",
          status: "failed",
          createdMinutesAgo: 3 * 60 + 30,
          verificationStatus: "fail",
          evaluationCount: 1,
        },
        {
          id: "e_fail_2",
          hypothesisId: "h_fail_2",
          title: "Prewarm on schedule",
          summary: "Crontab style prewarm.",
          status: "failed",
          createdMinutesAgo: 2 * 60 + 30,
          verificationStatus: "fail",
          evaluationCount: 1,
        },
      ],
    }),
  },
};

export const Active: Story = {
  args: {
    input: {
      project: RESEARCH_PROJECT_FIXTURES[0],
      hypotheses: HYPOTHESIS_FIXTURES,
      experiments: EXPERIMENT_FIXTURES,
      entityLinks: ENTITY_LINK_FIXTURES,
      researchTasks: RESEARCH_TASK_FIXTURES,
      verifications: RESEARCH_TASK_VERIFICATION_FIXTURES,
      evaluations: EVALUATION_FIXTURES,
      measurements: MEASUREMENT_FIXTURES,
      now: hourBefore(0),
    },
  },
};

export const RealisticFullRun: Story = {
  name: "Realistic full run (~8h, 20 hypotheses, 50 experiments)",
  args: {
    input: inputFromSpec(buildRealisticFullRun()),
  },
};

function buildRealisticFullRun(): StorySpec {
  const hypotheses: StorySpec["hypotheses"] = [
    {
      id: "h1",
      title: "Per-task evidence cache is the dominant verifier cost",
      summary: "Repeated read-through of the same evaluation rows pads the verifier path.",
      status: "in_review",
      createdMinutesAgo: 470,
    },
    {
      id: "h2",
      title: "Verifier prompt size dominates token spend on long sessions",
      summary: "Background and history sections inflate prompt tokens 3x on long runs.",
      status: "in_review",
      createdMinutesAgo: 440,
    },
    {
      id: "h3",
      title: "DB connection pool saturates around 12 concurrent verifiers",
      summary: "Pool exhaustion stalls evidence reads behind connection waits.",
      status: "failed",
      createdMinutesAgo: 410,
    },
    {
      id: "h4",
      title: "Cold-start tool dispatcher trips a 1.5s warmup tax",
      summary: "First verifier invocation per worker pays a JIT/load cost.",
      status: "in_review",
      createdMinutesAgo: 380,
    },
    {
      id: "h5",
      title: "Per-task + per-session cache compounds the hit rate",
      summary: "Layering session scope on top of the per-task cache lifts hit rate further.",
      status: "in_review",
      createdMinutesAgo: 340,
    },
    {
      id: "h6",
      title: "Admission control on cache writes reduces thrash",
      summary: "Reject low-value writes to keep hot keys resident.",
      status: "failed",
      createdMinutesAgo: 320,
    },
    {
      id: "h7",
      title: "Pre-fork worker pool eliminates dispatcher cold-start",
      summary: "Forking processes ahead of demand absorbs the warmup tax.",
      status: "in_review",
      createdMinutesAgo: 310,
    },
    {
      id: "h8",
      title: "Lease sweeper drops claims under burst, forcing re-verifications",
      summary: "Lease churn doubles verification work during traffic bursts.",
      status: "failed",
      createdMinutesAgo: 290,
    },
    {
      id: "h9",
      title: "Composite cache + warmer pool sustains 90%+ hit rate",
      summary: "Per-task + per-session + dedicated warmer pushes hit rate past 90%.",
      status: "in_review",
      createdMinutesAgo: 240,
    },
    {
      id: "h10",
      title: "Binary serialization halves cache memory footprint",
      summary: "Protobuf-encoded entries cut RSS pressure on the cache hosts.",
      status: "in_review",
      createdMinutesAgo: 200,
    },
    {
      id: "h11",
      title: "Sharding the cache across nodes reduces per-node pressure",
      summary: "Hash-shard cache writes across N hosts.",
      status: "failed",
      createdMinutesAgo: 195,
    },
    {
      id: "h12",
      title: "zstd compression of cache values improves L2 hit cost",
      summary: "Trade CPU for memory by compressing larger entries.",
      status: "in_review",
      createdMinutesAgo: 190,
    },
    {
      id: "h13",
      title: "Dedicated warmer process pool absorbs cold misses",
      summary: "A small pool of warmer processes pre-populates the hot set.",
      status: "in_review",
      createdMinutesAgo: 185,
    },
    {
      id: "h14",
      title: "Priority-aware admission control protects hot keys",
      summary: "Score writes by tenant + recency before admission.",
      status: "failed",
      createdMinutesAgo: 180,
    },
    {
      id: "h15",
      title: "Stale evaluation rows pollute the prompt and trigger fallbacks",
      summary: "Rows older than 24h confuse the verifier and force fallback paths.",
      status: "in_review",
      createdMinutesAgo: 170,
    },
    {
      id: "h16",
      title: "Binary + zstd compounds cache wins further",
      summary: "Stack binary serialization on top of zstd for the cache hot path.",
      status: "in_review",
      createdMinutesAgo: 120,
    },
    {
      id: "h17",
      title: "Lazy tool registry defers cold-start on idle workers",
      summary: "Skip registry preload until first tool dispatch.",
      status: "active",
      createdMinutesAgo: 110,
    },
    {
      id: "h18",
      title: "Version-tagged eval filter eliminates stale-row noise",
      summary: "Tag eval rows with code version and drop mismatches at filter time.",
      status: "active",
      createdMinutesAgo: 70,
    },
    {
      id: "h19",
      title: "Adaptive lease TTL based on observed worker p95",
      summary: "Scale TTL to observed worker latency to reduce lease churn.",
      status: "active",
      createdMinutesAgo: 50,
    },
    {
      id: "h20",
      title: "Per-tenant cache shards isolate noisy tenants",
      summary: "Shard the cache by tenant to prevent cross-tenant eviction storms.",
      status: "failed",
      createdMinutesAgo: 40,
    },
  ];

  const experiments: SpecExperiment[] = [
    ...spreadExperiments("e_h1", {
      hypothesisId: "h1",
      startMinutesAgo: 460,
      endMinutesAgo: 420,
      variants: [
        {
          title: "Per-task cache prototype",
          summary: "Wrap evidence reads in a per-task cache.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 3,
        },
        {
          title: "Per-task cache + read-through",
          summary: "Pull through cache misses.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 3,
          forkFromIndex: 0,
        },
        {
          title: "Per-task cache + bounded TTL",
          summary: "30s TTL to bound staleness.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 4,
          forkFromIndex: 1,
        },
      ],
    }),
    ...spreadExperiments("e_h2", {
      hypothesisId: "h2",
      startMinutesAgo: 430,
      endMinutesAgo: 390,
      variants: [
        {
          title: "Drop background context",
          summary: "Trim 800 tokens of background.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 2,
        },
        {
          title: "Trim + structured evidence",
          summary: "Replace prose with bullets.",
          status: "in_review",
          verificationStatus: "needs_more_evidence",
          evaluationCount: 1,
          forkFromIndex: 0,
        },
        {
          title: "Trim + summarize history",
          summary: "Summarize prior history block.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 1,
          forkFromIndex: 1,
        },
      ],
    }),
    ...spreadExperiments("e_h3", {
      hypothesisId: "h3",
      startMinutesAgo: 405,
      endMinutesAgo: 365,
      variants: [
        {
          title: "Bump pool to 16 connections",
          summary: "Raise the DB connection ceiling.",
          status: "failed",
          verificationStatus: "fail",
          evaluationCount: 1,
        },
        {
          title: "Pool=24 + queue overflow guard",
          summary: "Raise pool, add a queue.",
          status: "failed",
          verificationStatus: "fail",
          forkFromIndex: 0,
        },
        {
          title: "Per-tenant pools",
          summary: "Sharded pool by tenant.",
          status: "failed",
          verificationStatus: "fail",
          evaluationCount: 1,
          forkFromIndex: 1,
        },
      ],
    }),
    ...spreadExperiments("e_h4", {
      hypothesisId: "h4",
      startMinutesAgo: 375,
      endMinutesAgo: 335,
      variants: [
        {
          title: "Warmup ping on worker boot",
          summary: "Send a noop verifier call at boot.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 2,
        },
        {
          title: "Warmup + JIT precompile",
          summary: "Force JIT precompile of hot paths.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 2,
          forkFromIndex: 0,
        },
        {
          title: "Warmup + tool registry preload",
          summary: "Preload tool registry on boot.",
          status: "in_review",
          verificationStatus: "needs_more_evidence",
          evaluationCount: 1,
          forkFromIndex: 1,
        },
      ],
    }),
    ...spreadExperiments("e_h5", {
      hypothesisId: "h5",
      startMinutesAgo: 330,
      endMinutesAgo: 290,
      variants: [
        {
          title: "Per-task + per-session cache",
          summary: "Composite session-scoped cache.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 3,
          parentExperimentId: "e_h1_3",
        },
        {
          title: "Per-task + per-session + LRU eviction",
          summary: "LRU eviction on hot keys.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 3,
          forkFromIndex: 0,
        },
        {
          title: "Composite + speculative refresh",
          summary: "Refresh cache in background on TTL expiry.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 2,
          forkFromIndex: 1,
        },
      ],
    }),
    ...spreadExperiments("e_h6", {
      hypothesisId: "h6",
      startMinutesAgo: 315,
      endMinutesAgo: 295,
      variants: [
        {
          title: "Cache + admission control",
          summary: "Reject low-value writes.",
          status: "failed",
          verificationStatus: "fail",
          evaluationCount: 1,
          parentExperimentId: "e_h1_3",
        },
        {
          title: "Admission + write rejection",
          summary: "Hard reject below threshold.",
          status: "failed",
          verificationStatus: "fail",
          forkFromIndex: 0,
        },
      ],
    }),
    ...spreadExperiments("e_h7", {
      hypothesisId: "h7",
      startMinutesAgo: 300,
      endMinutesAgo: 260,
      variants: [
        {
          title: "Pre-fork worker pool",
          summary: "Fork verifier processes ahead of demand.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 2,
          parentExperimentId: "e_h4_2",
        },
        {
          title: "Pre-fork + persistent processes",
          summary: "Keep workers hot across requests.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 2,
          forkFromIndex: 0,
        },
        {
          title: "Pre-fork + warmer assist",
          summary: "Warmer process keeps the pool primed.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 3,
          forkFromIndex: 1,
        },
      ],
    }),
    ...spreadExperiments("e_h8", {
      hypothesisId: "h8",
      startMinutesAgo: 285,
      endMinutesAgo: 245,
      variants: [
        {
          title: "Lease TTL=120s baseline",
          summary: "Measure lease drop rate at 120s TTL.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 1,
        },
        {
          title: "Lease TTL=60s + heartbeat",
          summary: "Tighter TTL plus 20s heartbeat.",
          status: "failed",
          verificationStatus: "fail",
          evaluationCount: 1,
          forkFromIndex: 0,
        },
        {
          title: "Lease + grace window",
          summary: "30s grace before reclaim.",
          status: "failed",
          verificationStatus: "fail",
          forkFromIndex: 1,
        },
      ],
    }),
    ...spreadExperiments("e_h9", {
      hypothesisId: "h9",
      startMinutesAgo: 235,
      endMinutesAgo: 190,
      variants: [
        {
          title: "Composite cache + warmer pool",
          summary: "Per-task + per-session + warmer pool.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 4,
          parentExperimentId: "e_h5_2",
        },
        {
          title: "+ tier-2 disk cache",
          summary: "Spillover entries to local SSD.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 3,
          forkFromIndex: 0,
        },
        {
          title: "+ warmer pool refresh",
          summary: "Periodic refresh on warmer pool.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 4,
          forkFromIndex: 1,
        },
        {
          title: "+ lazy invalidation",
          summary: "Defer invalidation to read time.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 2,
          forkFromIndex: 2,
        },
      ],
    }),
    ...spreadExperiments("e_h10", {
      hypothesisId: "h10",
      startMinutesAgo: 195,
      endMinutesAgo: 170,
      variants: [
        {
          title: "Binary serialization (protobuf)",
          summary: "Replace JSON with protobuf in cache.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 3,
          parentExperimentId: "e_h9_3",
        },
        {
          title: "Binary + schema versioning",
          summary: "Tag entries with schema version.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 2,
          forkFromIndex: 0,
        },
      ],
    }),
    ...spreadExperiments("e_h11", {
      hypothesisId: "h11",
      startMinutesAgo: 190,
      endMinutesAgo: 160,
      variants: [
        {
          title: "Sharded across 8 nodes",
          summary: "Hash-shard cache writes across 8 hosts.",
          status: "failed",
          verificationStatus: "fail",
          evaluationCount: 1,
          parentExperimentId: "e_h9_3",
        },
        {
          title: "Sharded + consistent hash",
          summary: "Replace mod-N with consistent hash.",
          status: "failed",
          verificationStatus: "fail",
          forkFromIndex: 0,
        },
      ],
    }),
    ...spreadExperiments("e_h12", {
      hypothesisId: "h12",
      startMinutesAgo: 185,
      endMinutesAgo: 150,
      variants: [
        {
          title: "zstd compression",
          summary: "Compress cache values with zstd.",
          status: "in_review",
          verificationStatus: "needs_more_evidence",
          evaluationCount: 1,
          parentExperimentId: "e_h9_3",
        },
        {
          title: "zstd + dictionary tuning",
          summary: "Train a dict on the hot key set.",
          status: "in_review",
          verificationStatus: "suspicious",
          evaluationCount: 1,
          forkFromIndex: 0,
        },
      ],
    }),
    ...spreadExperiments("e_h13", {
      hypothesisId: "h13",
      startMinutesAgo: 180,
      endMinutesAgo: 145,
      variants: [
        {
          title: "Dedicated warmer process pool",
          summary: "Small pool of warmer processes.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 2,
          parentExperimentId: "e_h9_3",
        },
        {
          title: "Warmer pool + scheduled warmup",
          summary: "Warm hot set on a 30s tick.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 2,
          forkFromIndex: 0,
        },
      ],
    }),
    ...spreadExperiments("e_h14", {
      hypothesisId: "h14",
      startMinutesAgo: 175,
      endMinutesAgo: 140,
      variants: [
        {
          title: "Admission control v2 (priority)",
          summary: "Score writes by tenant + recency.",
          status: "failed",
          verificationStatus: "fail",
          evaluationCount: 1,
          parentExperimentId: "e_h9_3",
        },
        {
          title: "Admission v2 + load shedding",
          summary: "Drop writes under high load.",
          status: "failed",
          verificationStatus: "fail",
          forkFromIndex: 0,
        },
      ],
    }),
    ...spreadExperiments("e_h15", {
      hypothesisId: "h15",
      startMinutesAgo: 165,
      endMinutesAgo: 115,
      variants: [
        {
          title: "Filter eval rows older than 24h",
          summary: "Skip stale rows.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 1,
          measurementCount: 1,
        },
        {
          title: "Filter + soft-deletion",
          summary: "Mark stale rows soft-deleted.",
          status: "in_review",
          verificationStatus: "suspicious",
          evaluationCount: 1,
          forkFromIndex: 0,
        },
        {
          title: "Filter + retention sweep",
          summary: "Hourly sweep deletes >24h rows.",
          status: "in_review",
          verificationStatus: "needs_more_evidence",
          evaluationCount: 1,
          forkFromIndex: 1,
        },
      ],
    }),
    ...spreadExperiments("e_h16", {
      hypothesisId: "h16",
      startMinutesAgo: 115,
      endMinutesAgo: 55,
      variants: [
        {
          title: "Binary + zstd",
          summary: "Stack binary on top of zstd.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 3,
          parentExperimentId: "e_h10_1",
        },
        {
          title: "+ frame-skip dedup",
          summary: "Dedup repeated frames in encoded entries.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 3,
          forkFromIndex: 0,
        },
        {
          title: "+ adaptive zstd level",
          summary: "Pick zstd level by entry size.",
          status: "done",
          verificationStatus: "pass",
          evaluationCount: 2,
          measurementCount: 4,
          forkFromIndex: 1,
        },
      ],
    }),
    ...spreadExperiments("e_h17", {
      hypothesisId: "h17",
      startMinutesAgo: 105,
      endMinutesAgo: 75,
      variants: [
        {
          title: "Lazy tool registry on workers",
          summary: "Defer registry until first dispatch.",
          status: "active",
          evaluationCount: 1,
          parentExperimentId: "e_h7_3",
        },
        {
          title: "Lazy registry + per-tool warmup",
          summary: "Warm only tools used in last 5m.",
          status: "active",
          forkFromIndex: 0,
        },
      ],
    }),
    ...spreadExperiments("e_h18", {
      hypothesisId: "h18",
      startMinutesAgo: 65,
      endMinutesAgo: 40,
      variants: [
        {
          title: "Version-tagged filter",
          summary: "Drop eval rows with mismatched code version.",
          status: "active",
          evaluationCount: 1,
          parentExperimentId: "e_h15_3",
        },
        {
          title: "+ verifier-side dedup",
          summary: "Dedup eval rows in verifier.",
          status: "active",
          forkFromIndex: 0,
        },
      ],
    }),
    ...spreadExperiments("e_h19", {
      hypothesisId: "h19",
      startMinutesAgo: 45,
      endMinutesAgo: 25,
      variants: [
        {
          title: "Adaptive TTL on worker p95",
          summary: "TTL scales with worker latency.",
          status: "active",
          evaluationCount: 1,
        },
        {
          title: "Adaptive + claim batching",
          summary: "Batch claim renewals.",
          status: "active",
          forkFromIndex: 0,
        },
      ],
    }),
    ...spreadExperiments("e_h20", {
      hypothesisId: "h20",
      startMinutesAgo: 30,
      endMinutesAgo: 30,
      variants: [
        {
          title: "Per-tenant cache shards",
          summary: "Shard cache by tenant to isolate noisy ones.",
          status: "failed",
          verificationStatus: "fail",
          evaluationCount: 1,
          parentExperimentId: "e_h9_3",
        },
      ],
    }),
  ];

  return {
    projectId: "rpj_real",
    projectTitle: "Cut verifier acceptance-path P95 from 8s to under 3s under sustained peak load",
    projectStartedMinutesAgo: 8 * 60 + 12,
    hypotheses,
    experiments,
  };
}

export const ConcurrentBurst: Story = {
  args: {
    input: inputFromSpec({
      projectId: "rpj_burst",
      projectTitle: "Manager seeded five forks at once",
      projectStartedMinutesAgo: 90,
      hypotheses: [
        {
          id: "h_burst",
          title: "Lease sweeper batches starve under burst load",
          summary: "Five fork variants spawned simultaneously after triage.",
          status: "active",
          createdMinutesAgo: 80,
        },
        {
          id: "h_quiet",
          title: "Single experiment for control",
          summary: "Solo lane for visual contrast.",
          status: "active",
          createdMinutesAgo: 70,
        },
      ],
      experiments: [
        {
          id: "e_burst_1",
          hypothesisId: "h_burst",
          title: "Sweeper batch=4 baseline",
          summary: "Initial fork.",
          status: "active",
          createdMinutesAgo: 30,
          evaluationCount: 1,
        },
        {
          id: "e_burst_2",
          hypothesisId: "h_burst",
          title: "Sweeper batch=8 variant",
          summary: "Doubled batch size.",
          status: "active",
          createdMinutesAgo: 30,
          verificationStatus: "needs_more_evidence",
        },
        {
          id: "e_burst_3",
          hypothesisId: "h_burst",
          title: "Sweeper batch=16 variant",
          summary: "Quad batch size.",
          status: "failed",
          createdMinutesAgo: 30,
          verificationStatus: "fail",
          evaluationCount: 2,
        },
        {
          id: "e_burst_4",
          hypothesisId: "h_burst",
          title: "Sweeper batch=8 + priority",
          summary: "Priority queue on top of batch=8.",
          status: "active",
          createdMinutesAgo: 30,
          verificationStatus: "pending",
        },
        {
          id: "e_burst_5",
          hypothesisId: "h_burst",
          title: "Sweeper batch=8 + bypass",
          summary: "Bypass cache for sweeper.",
          status: "done",
          createdMinutesAgo: 30,
          verificationStatus: "pass",
          evaluationCount: 3,
          measurementCount: 6,
        },
        {
          id: "e_quiet_1",
          hypothesisId: "h_quiet",
          title: "Control: leave sweeper at default",
          summary: "Solo experiment for contrast.",
          status: "active",
          createdMinutesAgo: 50,
          verificationStatus: "pass",
          evaluationCount: 1,
        },
      ],
    }),
  },
};

export const Empty: Story = {
  args: {
    input: {
      project: RESEARCH_PROJECT_FIXTURES[0],
      hypotheses: [],
      experiments: [],
      entityLinks: [],
      researchTasks: [],
      verifications: [],
      evaluations: [],
      measurements: [],
      now: STORY_NOW,
    },
  },
};
