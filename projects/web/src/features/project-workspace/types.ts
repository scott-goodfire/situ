import type {
  AgentRecord,
  AnalysisActivityRecord,
  AnalysisRecord,
  ArtifactRecord,
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisExperimentLinkRecord,
  HypothesisRecord,
  ProjectRecord,
  SessionRecord,
  TaskActivityRecord,
  TaskDependencyRecord,
  TaskEntityLinkRecord,
  TaskRecord,
} from "@situ/protocol";
import type { ConnectionState } from "../run-monitor/connection-badge";

export type ProjectWorkspaceData = {
  projectId: string;
  workspace: string | undefined;
  connection: ConnectionState;
  project: ProjectRecord | undefined;
  sessions: SessionRecord[];
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  analyses: AnalysisRecord[];
  agents: AgentRecord[];
  tasks: TaskRecord[];
  taskDependencies: TaskDependencyRecord[];
  taskEntityLinks: TaskEntityLinkRecord[];
  taskActivities: TaskActivityRecord[];
  analysisActivities: AnalysisActivityRecord[];
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
