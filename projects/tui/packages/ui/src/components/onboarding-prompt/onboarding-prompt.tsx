import type { SessionStartParams } from "@situ/protocol";
import { Text, useInput, useStdin } from "ink";
import { useState } from "react";
import {
  ChoicePrompt,
  type ChoicePromptOption,
  type ChoicePromptSelection,
} from "../choice-prompt/choice-prompt.js";
import { CommandInput } from "../command-input/command-input.js";
import { LayoutBox } from "../layout-box/layout-box.js";
import { PaneSection } from "../pane-section/pane-section.js";
import { previewText } from "../text-preview/text-preview.js";
import {
  MIN_DASHBOARD_HEIGHT,
  MIN_DASHBOARD_WIDTH,
  computeDashboardLayout,
} from "../fullscreen-dashboard/dashboard-layout.js";
import {
  DashboardFrame,
  DashboardFrameFooter,
  DashboardFrameSection,
} from "../fullscreen-dashboard/dashboard-frame.js";
import {
  useTerminalSize,
  type TerminalSize,
} from "../fullscreen-dashboard/use-terminal-size.js";

export type OnboardingAnswers = {
  objective: string;
  researchContext: string;
};

type OnboardingStep = "objective" | "context" | "confirm";

const confirmOptions = [
  {
    label: "Start session",
    value: "start",
    description: "Create a fresh project and session.",
  },
  {
    label: "Edit objective",
    value: "objective",
    description: "Change what this run should improve or learn.",
  },
  {
    label: "Edit context",
    value: "context",
    description: "Change how progress should be judged.",
  },
  {
    label: "Exit",
    value: "exit",
    description: "Close without starting any research work.",
  },
] satisfies ChoicePromptOption[];

export function OnboardingPrompt({
  workspace,
  defaults,
  initialAnswers = { objective: "", researchContext: "" },
  isActive = true,
  onSubmit,
  onExit,
  terminalSize,
}: {
  workspace: string;
  defaults: OnboardingAnswers & Pick<SessionStartParams, "max_experiments">;
  initialAnswers?: Partial<OnboardingAnswers>;
  isActive?: boolean;
  onSubmit: ({ answers }: { answers: OnboardingAnswers }) => void;
  onExit: () => void;
  terminalSize?: TerminalSize;
}) {
  const [step, setStep] = useState<OnboardingStep>("objective");
  const [objectiveDraft, setObjectiveDraft] = useState(
    initialAnswers.objective ?? "",
  );
  const [contextDraft, setContextDraft] = useState(
    initialAnswers.researchContext ?? "",
  );
  const detectedTerminalSize = useTerminalSize();
  const effectiveTerminalSize = terminalSize ?? detectedTerminalSize;
  const layout = computeDashboardLayout({
    columns: effectiveTerminalSize.columns,
    rows: effectiveTerminalSize.rows,
  });
  const answers = resolveOnboardingAnswers({
    objectiveDraft,
    researchContextDraft: contextDraft,
    defaults,
  });

  if (layout.mode === "too-small") {
    return (
      <SmallTerminalNotice
        width={layout.width}
        height={layout.height}
        onCancel={onExit}
      />
    );
  }

  const sectionHeight = Math.max(1, layout.height - layout.headerHeight - 3);

  return (
    <DashboardFrame
      title={`SITU / ${workspaceName({ workspace })} / onboarding`}
      width={layout.width}
      height={layout.height}
      footer={
        <DashboardFrameFooter
          label={footerLabel({ step })}
          width={layout.width}
        />
      }
    >
      <DashboardFrameSection width={layout.width} height={layout.headerHeight}>
        <OnboardingHeader
          width={layout.contentWidth}
          workspace={workspace}
          step={step}
          maxExperiments={defaults.max_experiments ?? 6}
        />
      </DashboardFrameSection>

      <DashboardFrameSection
        label="onboarding"
        width={layout.width}
        height={sectionHeight}
      >
        <LayoutBox width={layout.contentWidth} height={sectionHeight}>
          {step === "objective" && (
            <SetupInput
              title="Objective"
              prompt="What should this research session improve or learn?"
              fallback={defaults.objective}
              draft={objectiveDraft}
              isActive={isActive}
              onChange={setObjectiveDraft}
              onCancel={onExit}
              onSubmit={() => {
                setStep("context");
              }}
            />
          )}

          {step === "context" && (
            <SetupInput
              title="Research context"
              prompt="How should Situ judge progress? Include evals, commands, metrics, logs, or constraints."
              fallback={defaults.researchContext}
              draft={contextDraft}
              isActive={isActive}
              onChange={setContextDraft}
              onCancel={onExit}
              onSubmit={() => {
                setStep("confirm");
              }}
            />
          )}

          {step === "confirm" && (
            <ConfirmSetup
              answers={answers}
              maxExperiments={defaults.max_experiments ?? 6}
              isActive={isActive}
              onSelect={({ option }) => {
                handleConfirmSelection({
                  option,
                  answers,
                  setStep,
                  onSubmit,
                  onExit,
                });
              }}
              onCancel={() => {
                setStep("context");
              }}
            />
          )}
        </LayoutBox>
      </DashboardFrameSection>
    </DashboardFrame>
  );
}

export function resolveOnboardingAnswers({
  objectiveDraft,
  researchContextDraft,
  defaults,
}: {
  objectiveDraft: string;
  researchContextDraft: string;
  defaults: OnboardingAnswers;
}): OnboardingAnswers {
  return {
    objective: objectiveDraft.trim() || defaults.objective,
    researchContext: researchContextDraft.trim() || defaults.researchContext,
  };
}

function OnboardingHeader({
  width,
  workspace,
  step,
  maxExperiments,
}: {
  width: number;
  workspace: string;
  step: OnboardingStep;
  maxExperiments: number;
}) {
  return (
    <LayoutBox width={width}>
      <Text>
        {previewText({
          value: `setup ${stepLabel({ step })} · fresh project and fresh session`,
          maxCharacters: Math.max(24, width),
        })}
      </Text>
      <Text dimColor>
        {previewText({
          value: `${workspace} · budget ${maxExperiments} experiments`,
          maxCharacters: Math.max(24, width),
        })}
      </Text>
    </LayoutBox>
  );
}

function SetupInput({
  title,
  prompt,
  fallback,
  draft,
  isActive,
  onChange,
  onCancel,
  onSubmit,
}: {
  title: string;
  prompt: string;
  fallback: string;
  draft: string;
  isActive: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <PaneSection title={title} chrome="none">
      <Text>{prompt}</Text>
      <Text dimColor>
        {`Leave blank to use: ${previewText({
          value: fallback,
          maxCharacters: 96,
        })}`}
      </Text>
      <CommandInput
        draft={draft}
        isActive={isActive}
        message={undefined}
        onCancel={onCancel}
        onChange={({ value }) => {
          onChange(value);
        }}
        onSubmit={onSubmit}
      />
    </PaneSection>
  );
}

function ConfirmSetup({
  answers,
  maxExperiments,
  isActive,
  onCancel,
  onSelect,
}: {
  answers: OnboardingAnswers;
  maxExperiments: number;
  isActive: boolean;
  onCancel: () => void;
  onSelect: ({ option, index }: ChoicePromptSelection) => void;
}) {
  return (
    <PaneSection title="Confirm setup" chrome="none">
      <Text>{`Objective: ${answers.objective}`}</Text>
      <Text dimColor>{`Context: ${answers.researchContext}`}</Text>
      <Text dimColor>{`Budget: ${maxExperiments} experiments`}</Text>
      <ChoicePrompt
        title="Next"
        options={confirmOptions}
        isActive={isActive}
        onCancel={onCancel}
        onSelect={onSelect}
      />
    </PaneSection>
  );
}

function handleConfirmSelection({
  option,
  answers,
  setStep,
  onSubmit,
  onExit,
}: {
  option: ChoicePromptSelection["option"];
  answers: OnboardingAnswers;
  setStep: (step: OnboardingStep) => void;
  onSubmit: ({ answers }: { answers: OnboardingAnswers }) => void;
  onExit: () => void;
}) {
  if (option.value === "start") {
    onSubmit({ answers });
    return;
  }

  if (option.value === "objective") {
    setStep("objective");
    return;
  }

  if (option.value === "context") {
    setStep("context");
    return;
  }

  onExit();
}

function SmallTerminalNotice({
  width,
  height,
  onCancel,
}: {
  width: number;
  height: number;
  onCancel: () => void;
}) {
  const { isRawModeSupported } = useStdin();
  const canUseInput = Boolean(process.stdin.isTTY) && isRawModeSupported;
  const noticeWidth = Math.max(44, Math.min(width, 72));

  useInput(
    (input, key) => {
      if (input === "q" || key.escape) {
        onCancel();
      }
    },
    {
      isActive: canUseInput,
    },
  );

  return (
    <LayoutBox
      width={width}
      height={height}
      alignItems="center"
      justifyContent="center"
    >
      <PaneSection
        title="Please expand terminal"
        chrome="box"
        tone="warning"
        width={noticeWidth}
      >
        <Text>
          {`Situ needs at least ${MIN_DASHBOARD_WIDTH}x${MIN_DASHBOARD_HEIGHT} to render.`}
        </Text>
        <Text dimColor>Current size {width}x{height}</Text>
        <Text dimColor>Press q or Escape to exit.</Text>
      </PaneSection>
    </LayoutBox>
  );
}

function footerLabel({ step }: { step: OnboardingStep }): string {
  if (step === "confirm") {
    return "Enter selects · Esc edits context";
  }

  return "Enter continues · Backspace edits · Esc clears/exits";
}

function stepLabel({ step }: { step: OnboardingStep }): string {
  if (step === "objective") {
    return "1/3 objective";
  }

  if (step === "context") {
    return "2/3 context";
  }

  return "3/3 confirm";
}

function workspaceName({ workspace }: { workspace: string }): string {
  const parts = workspace.split("/").filter(Boolean);

  return parts[parts.length - 1] ?? workspace;
}
