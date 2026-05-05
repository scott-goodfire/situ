import type {
  EventRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisRecord,
  ObjectiveRecord,
  SessionRecord,
} from "@almanac/protocol";
import { ActivitySection } from "../activity-section/activity-section.js";
import { AppFrame } from "../app-frame/app-frame.js";
import {
  CommandInput,
  type CommandMessage,
} from "../command-input/command-input.js";
import { ExperimentsSection } from "../experiments-section/experiments-section.js";
import { HypothesesSection } from "../hypotheses-section/hypotheses-section.js";
import { NowSection } from "../now-section/now-section.js";
import { SessionSection } from "../session-section/session-section.js";
import { TimelineSection } from "../timeline-section/timeline-section.js";

export function AlmanacTuiView({
  workspace,
  statusLine,
  commandDraft,
  commandMessage,
  objective,
  session,
  experimentCount,
  maxExperiments,
  activeExperiment,
  hypotheses,
  experiments,
  hypothesisActivities,
  experimentActivities,
  events,
  onCommandChange,
  onCommandSubmit,
}: {
  workspace: string;
  statusLine: string;
  commandDraft: string;
  commandMessage: CommandMessage | undefined;
  objective: ObjectiveRecord | undefined;
  session: SessionRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
  activeExperiment: ExperimentRecord | undefined;
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  events: EventRecord[];
  onCommandChange: ({ value }: { value: string }) => void;
  onCommandSubmit: ({ value }: { value: string }) => void;
}) {
  return (
    <AppFrame
      workspace={workspace}
      statusLine={statusLine}
      footer={
        <CommandInput
          draft={commandDraft}
          message={commandMessage}
          onChange={onCommandChange}
          onSubmit={onCommandSubmit}
        />
      }
    >
      <SessionSection
        objective={objective}
        session={session}
        experimentCount={experimentCount}
        maxExperiments={maxExperiments}
      />
      <NowSection activeExperiment={activeExperiment} latestSession={session} />
      <HypothesesSection hypotheses={hypotheses} />
      <ExperimentsSection
        experiments={experiments}
        experimentActivities={experimentActivities}
      />
      <ActivitySection
        hypothesisActivities={hypothesisActivities}
        experimentActivities={experimentActivities}
      />
      <TimelineSection events={events} />
    </AppFrame>
  );
}
