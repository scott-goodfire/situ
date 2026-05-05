import type { EventRecord, ExperimentRecord, RunRecord } from "@almanac/protocol";
import { AppFrame } from "../app-frame/app-frame.js";
import {
  CommandInput,
  type CommandMessage,
} from "../command-input/command-input.js";
import { ExperimentsSection } from "../experiments-section/experiments-section.js";
import { NowSection } from "../now-section/now-section.js";
import { RunSection } from "../run-section/run-section.js";
import { TimelineSection } from "../timeline-section/timeline-section.js";

export function AlmanacTuiView({
  workspace,
  statusLine,
  commandDraft,
  commandMessage,
  run,
  experimentCount,
  maxExperiments,
  activeExperiment,
  experiments,
  events,
  onCommandChange,
  onCommandSubmit,
}: {
  workspace: string;
  statusLine: string;
  commandDraft: string;
  commandMessage: CommandMessage | undefined;
  run: RunRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
  activeExperiment: ExperimentRecord | undefined;
  experiments: ExperimentRecord[];
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
      <RunSection
        run={run}
        experimentCount={experimentCount}
        maxExperiments={maxExperiments}
      />
      <NowSection activeExperiment={activeExperiment} latestRun={run} />
      <ExperimentsSection experiments={experiments} />
      <TimelineSection events={events} />
    </AppFrame>
  );
}
