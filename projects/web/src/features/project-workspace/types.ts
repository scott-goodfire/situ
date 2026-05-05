import type {
  ArtifactRecord,
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisExperimentLinkRecord,
  HypothesisRecord,
  ObjectiveRecord,
  SessionRecord,
} from "@situ/protocol";
import type { ConnectionState } from "../run-monitor/connection-badge";

export type ProjectWorkspaceData = {
  projectId: string;
  workspace: string | undefined;
  connection: ConnectionState;
  objectives: ObjectiveRecord[];
  sessions: SessionRecord[];
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  hypothesisExperimentLinks: HypothesisExperimentLinkRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
  artifacts: ArtifactRecord[];
  events: EventRecord[];
};

export type ActivityItem = {
  id: string;
  actor: string;
  body: string;
  kind: string;
  createdAt: string;
};

export type AgentSummary = {
  id: string;
  latestActivityAt: string | null;
  hypothesisActivityCount: number;
  experimentActivityCount: number;
  evaluationActivityCount: number;
};
