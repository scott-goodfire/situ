import type {
  AgentRecord,
  AnalysisRecord,
  EventRecord,
  EvaluationRecord,
  ExperimentRecord,
  HypothesisRecord,
  TaskRecord,
} from "@situ/protocol";
import { DxBadge, vars } from "@situ/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import {
  Activity,
  Beaker,
  BookOpen,
  CheckSquare,
  FileText,
  FlaskConical,
  GitBranch,
  ListChecks,
  Users,
} from "lucide-react";
import {
  AgentsPageView,
  AnalysesPageView,
  AnalysisDetailView,
  EventsPageView,
  ExperimentsPageView,
  HypothesesPageView,
  TrajectoryPageView,
  OverviewPageView,
  ProjectIndexView,
  SituShell,
  TaskDetailView,
  TasksPageView,
  type CriticStatus,
  type EvaluationActivityListRow,
  type TrajectoryDetailViewData,
  type SituShellNavItem,
} from ".";

const meta: Meta = {
  title: "App UI/Cutover",
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ minHeight: "100vh", background: vars.color.stage }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj;

export const ProjectIndex: Story = {
  render: () => (
    <SituShell workspace="local-dev" topBarActions={<DxBadge>2 projects</DxBadge>}>
      <ProjectIndexView
        projects={[
          {
            id: "support-agent-demo",
            label: <a href="#">Support agent demo</a>,
            labelSort: "Support agent demo",
            workspace: "/Users/situ/sandbox/support-agent",
            objective: "Improve support-agent resolution",
            status: "running",
            lastSeen: "2026-01-01T00:08:00Z",
            openAction: <button type="button">Open</button>,
          },
          {
            id: "billing-router",
            label: <a href="#">Billing router research</a>,
            labelSort: "Billing router research",
            workspace: "/Users/situ/work/billing",
            objective: null,
            status: "stale",
            statusReason: "heartbeat older than 12m",
            lastSeen: "2026-01-01T00:03:00Z",
            openAction: <button type="button">Open</button>,
          },
        ]}
      />
    </SituShell>
  ),
};

export const WorkspaceOverview: Story = {
  render: () => (
    <Shell active="overview">
      <OverviewPageView
        title="Support agent demo"
        activeLine="active session / Reduce irrelevant cancellation policy citations / last comment 00:08:00Z"
        contextLine="/Users/situ/support-agent / S1 / billing cancellation slice"
        experimentCount={2}
        maxExperiments={6}
        experimentBudgetBar="[##----]"
        hypothesisCount={2}
        evaluationCount={2}
        tasks={[
          { id: "T1", title: "Run retrieval-filter candidate", status: "in-progress", tone: "warning" },
          { id: "T2", title: "Review baseline eval", status: "todo", tone: "neutral" },
          { id: "T3", title: "Publish candidate evidence", status: "done", tone: "success" },
        ]}
        activities={[
          {
            id: "A1",
            label: "created",
            body: "Try retrieval filtering",
            tone: "info",
            createdAt: "2026-01-01T00:07:00Z",
          },
          {
            id: "A2",
            label: "evidence",
            body: "resolution_rate improved to 64.8%",
            tone: "success",
            createdAt: "2026-01-01T00:08:00Z",
          },
        ]}
      />
    </Shell>
  ),
};

export const WorkspaceTables: Story = {
  render: () => (
    <Shell active="hypotheses">
      <HypothesesPageView
        rows={[
          {
            hypothesis: hypothesis,
            title: <a href="#">{hypothesis.title}</a>,
            experimentCount: 2,
            latestActivity: "Added retrieval filtering candidate.",
            evidence: { label: "2 evals", tone: "success", body: "resolution_rate 64.8%" },
          },
        ]}
      />
      <ExperimentsPageView
        rows={[
          {
            experiment,
            title: <a href="#">{experiment.title}</a>,
            hypothesisCount: 1,
            evidence: { label: "1 eval", tone: "success", body: "Candidate evidence present." },
          },
        ]}
      />
      <AnalysesPageView rows={[{ analysis, title: <a href="#">{analysis.title}</a> }]} />
      <TasksPageView rows={[{ task, title: <a href="#">{task.title}</a>, assignee: "Researcher" }]} />
      <AgentsPageView rows={[{ agent, title: <a href="#">{agent.display_name}</a> }]} />
      <EventsPageView events={[event]} />
    </Shell>
  ),
};

export const MarkdownRendering: Story = {
  render: () => (
    <Shell active="analyses">
      <OverviewPageView
        title="Moons **autoresearch** run"
        activeLine="active session / Minimize `val_loss` / last evidence 00:08:00Z"
        contextLine="/Users/situ/moons / S2 / edit `train.py` only"
        experimentCount={2}
        maxExperiments={6}
        experimentBudgetBar="[##----]"
        hypothesisCount={2}
        evaluationCount={2}
        tasks={[
          {
            id: "T10",
            title: "Reproduce **EX1** from `parent_experiment`",
            status: "in-progress",
            tone: "warning",
          },
        ]}
        activities={[
          {
            id: "A1",
            label: "evidence",
            body: "**EX1 reproduced.** `val_loss` moved from 0.1598 to 0.1021.",
            tone: "success",
            createdAt: "2026-01-01T00:08:00Z",
          },
        ]}
      />

      <AnalysisDetailView
        analysis={markdownAnalysis}
        activities={[
          {
            id: "analysis-activity-1",
            actor: "Critic",
            kind: "comment",
            body: [
              "### Review note",
              "I trust the direction, but I want one more run before Manager stacks another descendant.",
              "",
              "- `M3` used the same command as baseline.",
              "- The workspace was clean before measurement.",
            ].join("\n"),
            createdAt: "2026-01-01T00:09:00Z",
          },
        ]}
      />

      <TaskDetailView
        task={markdownTask}
        assignee="Scientist"
        blockedBy={[]}
        blocks={[]}
        links={[]}
        activities={[
          {
            id: "task-activity-1",
            actor: "Scientist",
            kind: "comment",
            body: "I'm running this as a **measurement-only** reproduction. The worktree already has `MLP(2, [8, 1])` from EX1.",
            createdAt: "2026-01-01T00:10:00Z",
          },
        ]}
      />

      <EventsPageView
        events={[
          {
            ...event,
            id: 42,
            message: "Recorded **M3** with `val_loss=0.1021`.",
          },
        ]}
      />
    </Shell>
  ),
};

export const Trajectory: Story = {
  render: () => {
    const criticStatusByExperimentId = new Map<string, CriticStatus>([
      ["EX1", "reviewed"],
      ["EX2", "pending"],
    ]);
    return (
      <Shell active="trajectory">
        <TrajectoryPageView
          experiments={[experimentRoot, experiment]}
          selectedExperimentId="EX2"
          failedExperimentIds={new Set()}
          criticStatusByExperimentId={criticStatusByExperimentId}
          detail={trajectoryDetail}
          onSelect={() => undefined}
          loadArtifactContent={async ({ artifactId }) => ({
            artifact_id: artifactId,
            media_type: "text/x-patch",
            size_bytes: 145,
            content: [
              "diff --git a/src/retrieval.ts b/src/retrieval.ts",
              "--- a/src/retrieval.ts",
              "+++ b/src/retrieval.ts",
              "@@ -1 +1 @@",
              "-export const confidenceFloor = 0.2;",
              "+export const confidenceFloor = 0.42;",
            ].join("\n"),
            truncated: false,
            truncated_at_bytes: null,
          })}
          initialDetailTab="diff"
        />
      </Shell>
    );
  },
};

function Shell({
  active,
  children,
}: {
  active: SituShellNavItem["id"];
  children: ReactNode;
}) {
  return (
    <SituShell
      workspace="support-agent-demo"
      navItems={navItems.map((item) => ({ ...item, active: item.id === active }))}
      topBarActions={<DxBadge tone="success">Connected</DxBadge>}
    >
      {children}
    </SituShell>
  );
}

const navItems: SituShellNavItem[] = [
  { id: "overview", label: "Overview", icon: <FileText size={14} />, href: "#" },
  { id: "analyses", label: "Analyses", icon: <BookOpen size={14} />, href: "#" },
  { id: "hypotheses", label: "Hypotheses", icon: <Beaker size={14} />, href: "#" },
  { id: "experiments", label: "Experiments", icon: <FlaskConical size={14} />, href: "#" },
  { id: "trajectory", label: "Trajectory", icon: <GitBranch size={14} />, href: "#" },
  { id: "evaluations", label: "Evaluations", icon: <ListChecks size={14} />, href: "#" },
  { id: "tasks", label: "Tasks", icon: <CheckSquare size={14} />, href: "#" },
  { id: "agents", label: "Agents", icon: <Users size={14} />, href: "#" },
  { id: "events", label: "Events", icon: <Activity size={14} />, href: "#" },
];

const hypothesis: HypothesisRecord = {
  id: "H1",
  project_id: "P1",
  title: "Filtering low-confidence retrieval helps cancellation tickets",
  summary: "Drop weak snippets before tool calls.",
  status: "active",
  created_at: "2026-01-01T00:01:00Z",
  updated_at: "2026-01-01T00:08:00Z",
};

const experimentRoot: ExperimentRecord = {
  id: "EX1",
  project_id: "P1",
  parent_experiment_id: null,
  status: "done",
  title: "Baseline support eval",
  summary: "Recorded baseline support-agent eval output.",
  created_at: "2026-01-01T00:02:00Z",
  updated_at: "2026-01-01T00:03:00Z",
};

const experiment: ExperimentRecord = {
  id: "EX2",
  project_id: "P1",
  parent_experiment_id: "EX1",
  status: "active",
  title: "Try retrieval filtering",
  summary: "Filter snippets below the confidence floor.",
  research_thread: "retrieval",
  base_commit: "1111111222222233333334444444555555566666",
  candidate_commit: "aaaaaaabbbbbbbcccccccdddddddeeeeeeeffffff0",
  created_at: "2026-01-01T00:04:00Z",
  updated_at: "2026-01-01T00:08:00Z",
};

const evaluation: EvaluationRecord = {
  id: "EV1",
  project_id: "P1",
  status: "done",
  title: "Retrieval filtering candidate",
  summary: "Candidate measurement for EX2.",
  associated_experiment_id: "EX2",
  created_at: "2026-01-01T00:05:00Z",
  updated_at: "2026-01-01T00:08:00Z",
};

const analysis: AnalysisRecord = {
  id: "A1",
  project_id: "P1",
  status: "done",
  title: "Cancellation citation analysis",
  summary: "Candidate reduced weak citation usage.",
  content: "The candidate improved evidence grounding on the cancellation slice.",
  created_at: "2026-01-01T00:05:00Z",
  updated_at: "2026-01-01T00:08:00Z",
};

const markdownAnalysis: AnalysisRecord = {
  ...analysis,
  id: "A2",
  title: "The **shallower MLP** is the cleanest current win",
  summary: "EX1's `MLP(2, [8, 1])` candidate improves `val_loss` without changing the evaluation harness.",
  content: [
    "## Finding",
    "",
    "I think the shallower model is worth continuing. It reduces the model size and improved `val_loss` in the first run.",
    "",
    "| record | val_loss | note |",
    "| --- | ---: | --- |",
    "| B1/M1 | 0.1598 | baseline |",
    "| EX1/M3 | 0.1021 | reproduced candidate |",
    "",
    "The next useful step is a **measurement-only** reproduction from `parent_experiment=EX1`, not another architecture change.",
  ].join("\n"),
};

const task: TaskRecord = {
  id: "T1",
  project_id: "P1",
  title: "Run retrieval-filter candidate",
  content: "Re-run candidate twice and compare stdout digests.",
  kind: "experiment",
  status: "in_progress",
  priority: "high",
  source_kind: "manager",
  assignee_id: "agent_001",
  available_at: "2026-01-01T00:05:00Z",
  created_at: "2026-01-01T00:05:00Z",
  updated_at: "2026-01-01T00:08:00Z",
};

const markdownTask: TaskRecord = {
  ...task,
  id: "T10",
  title: "Reproduce **EX1** from its candidate commit",
  content: [
    "Re-run EX1 from its candidate commit so we can tell whether the shallow model win is real. This continues the architecture-throughput thread and tests H2 against the same B1 baseline measurements.",
    "",
    "- Use `base_selector=\"parent_experiment\"` with `parent_experiment_id=\"EX1\"`.",
    "- Do not modify `train.py`; the `MLP(2, [8, 1])` change should already be in the worktree.",
    "- Run `uv run train.py` and record `val_loss`, `peak_rss_mb`, and `num_steps`.",
    "",
    "The task is done when the new evaluation has a measurement, the experiment is submitted for Critic review, and the completion note names the experiment and measurement IDs.",
  ].join("\n"),
};

const agent: AgentRecord = {
  id: "agent_001",
  project_id: "P1",
  display_name: "Researcher",
  kind: "researcher",
  status: "active",
  model_name: "gpt-5.5",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:08:00Z",
};

const event: EventRecord = {
  id: 1,
  associated_session_id: "S1",
  type: "experiment.started",
  message: "Started retrieval filtering candidate.",
  created_at: "2026-01-01T00:04:00Z",
};

const evidenceRows: EvaluationActivityListRow[] = [
  {
    id: evaluation.id,
    title: <a href="#">{evaluation.title}</a>,
    titleSort: evaluation.title,
    status: <DxBadge tone="success">done</DxBadge>,
    statusSort: "done",
    latest: "resolution_rate 64.8%",
    updatedAt: evaluation.updated_at,
    rowTone: "success",
  },
];

const trajectoryDetail: TrajectoryDetailViewData = {
  experiment,
  parent: <a href="#">EX1</a>,
  linkedHypotheses: [{ id: hypothesis.id, title: <a href="#">{hypothesis.title}</a>, summary: hypothesis.summary }],
  artifacts: [
    {
      id: "ART1",
      title: "Patch handoff from EX2",
      path: "artifacts/patches/P1/ART1-EX2.patch",
      kind: "patch",
      media_type: "text/x-patch",
      size_bytes: 145,
    },
  ],
  evidenceRows,
  activities: [
    {
      id: "activity-1",
      actor: "Researcher",
      kind: "comment",
      body: "Candidate run completed with improved citation quality.",
      createdAt: "2026-01-01T00:08:00Z",
    },
  ],
};
