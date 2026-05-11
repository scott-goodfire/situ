import { render, screen, fireEvent } from "@testing-library/react";
import { DateTime } from "luxon";
import { describe, expect, it, vi } from "vitest";
import type {
  ExperimentRecord,
  HypothesisRecord,
  ResearchProjectRecord,
  Timestamp,
} from "../../domain/records";
import type { BuildResearchMapModelInput } from "./research-map-model";
import { ResearchMapView } from "./research-map-view";

const NOW: Timestamp = "2026-05-10T18:00:00.000Z";

function at(offsetMinutes: number): Timestamp {
  const dt = DateTime.fromISO(NOW, { zone: "utc" }).plus({ minutes: offsetMinutes });
  const iso = dt.toISO();
  if (iso === null) {
    throw new Error("test fixture produced invalid ISO");
  }
  return iso;
}

function project(): ResearchProjectRecord {
  return {
    id: "rpj_test",
    title: "Test Project",
    goal: "Test",
    status: "researching",
    baselineSummary: null,
    currentDecision: null,
    reportSummary: null,
    createdAt: at(-60),
    updatedAt: at(-1),
  };
}

function hypothesis(
  input: Partial<HypothesisRecord> & Pick<HypothesisRecord, "id" | "title">,
): HypothesisRecord {
  return {
    createdByResearchTaskId: null,
    createdByAgentId: null,
    summary: "",
    status: "active",
    createdAt: at(-50),
    updatedAt: at(-5),
    ...input,
  };
}

function experiment(
  input: Partial<ExperimentRecord> &
    Pick<ExperimentRecord, "id" | "title" | "createdByResearchTaskId">,
): ExperimentRecord {
  return {
    createdByAgentId: null,
    associatedHypothesisId: "hyp_1",
    parentExperimentId: null,
    summary: "",
    status: "active",
    worktreePath: null,
    baseCommit: null,
    candidateCommit: null,
    createdAt: at(-30),
    updatedAt: at(-5),
    ...input,
  };
}

function emptyInput(): BuildResearchMapModelInput {
  return {
    project: project(),
    hypotheses: [],
    experiments: [],
    entityLinks: [],
    researchTasks: [],
    verifications: [],
    evaluations: [],
    measurements: [],
    now: NOW,
  };
}

describe("ResearchMapView", () => {
  it("renders the toolbar, hypothesis count, and lane title", () => {
    const input: BuildResearchMapModelInput = {
      ...emptyInput(),
      hypotheses: [hypothesis({ id: "h1", title: "Cache hit improves latency" })],
    };

    render(<ResearchMapView input={input} />);

    expect(screen.getByText("1 hypothesis")).not.toBeNull();
    expect(screen.getByText("Cache hit improves latency")).not.toBeNull();
    expect(screen.queryByText("0 experiments")).toBeNull();
    expect(screen.queryByText("0 evidences")).toBeNull();
  });

  it("renders the framed empty state when there are no hypotheses", () => {
    render(<ResearchMapView input={emptyInput()} />);

    expect(screen.getByText("0 hypotheses")).not.toBeNull();
    expect(screen.getByText("Waiting for hypotheses")).not.toBeNull();
  });

  it("zooms continuously with larger plus and minus steps", () => {
    const input: BuildResearchMapModelInput = {
      ...emptyInput(),
      hypotheses: [hypothesis({ id: "h1", title: "Cache hit improves latency" })],
    };
    const { container } = render(<ResearchMapView input={input} />);
    const surfaceStyle = () =>
      container.querySelector<HTMLElement>("div[style*='--canvas-width']")?.getAttribute("style");

    expect(surfaceStyle()).toContain("--canvas-width: 1200px");

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(surfaceStyle()).toContain("--canvas-width: 1800px");

    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(surfaceStyle()).toContain("--canvas-width: 800px");
  });

  it("renders hypothesis rows without click behavior", () => {
    const input: BuildResearchMapModelInput = {
      ...emptyInput(),
      hypotheses: [hypothesis({ id: "h_pick", title: "Pick me" })],
    };
    const onSelectLane = vi.fn();
    render(<ResearchMapView input={input} onSelectLane={onSelectLane} />);

    expect(screen.queryByRole("button", { name: /Pick me/i })).toBeNull();
    fireEvent.click(screen.getByText("Pick me"));

    expect(onSelectLane).not.toHaveBeenCalled();
  });

  it("calls onSelectExperiment with the originating ResearchTask id when a node is clicked", () => {
    const input: BuildResearchMapModelInput = {
      ...emptyInput(),
      hypotheses: [hypothesis({ id: "h1", title: "h1" })],
      experiments: [
        experiment({
          id: "e1",
          createdByResearchTaskId: "tsk_e1",
          associatedHypothesisId: "h1",
          title: "Probe one",
        }),
      ],
      entityLinks: [
        {
          id: "lnk_1",
          fromKind: "hypothesis",
          fromId: "h1",
          toKind: "experiment",
          toId: "e1",
          relationship: "tested-by",
          createdAt: at(-30),
        },
      ],
    };
    const onSelectExperiment = vi.fn();
    render(<ResearchMapView input={input} onSelectExperiment={onSelectExperiment} />);

    fireEvent.click(screen.getByRole("button", { name: /Probe one/i }));

    expect(onSelectExperiment).toHaveBeenCalledWith({
      experimentId: "e1",
      researchTaskId: "tsk_e1",
    });
  });

  it("renders a cluster pill for concurrent experiments and lists them on click", () => {
    const sharedTime = at(-30);
    const input: BuildResearchMapModelInput = {
      ...emptyInput(),
      hypotheses: [hypothesis({ id: "h_burst", title: "Burst hypothesis" })],
      experiments: [
        experiment({
          id: "e_a",
          title: "Variant A",
          createdByResearchTaskId: "tsk_a",
          associatedHypothesisId: "h_burst",
          createdAt: sharedTime,
        }),
        experiment({
          id: "e_b",
          title: "Variant B",
          createdByResearchTaskId: "tsk_b",
          associatedHypothesisId: "h_burst",
          createdAt: sharedTime,
        }),
        experiment({
          id: "e_c",
          title: "Variant C",
          createdByResearchTaskId: "tsk_c",
          associatedHypothesisId: "h_burst",
          createdAt: sharedTime,
        }),
      ],
      entityLinks: ["e_a", "e_b", "e_c"].map((toId, index) => ({
        id: `lnk_${index}`,
        fromKind: "hypothesis" as const,
        fromId: "h_burst",
        toKind: "experiment" as const,
        toId,
        relationship: "tested-by",
        createdAt: sharedTime,
      })),
    };
    const onSelectExperiment = vi.fn();
    render(<ResearchMapView input={input} onSelectExperiment={onSelectExperiment} />);

    const trigger = screen.getByRole("button", { name: /3 experiments at this time/i });
    expect(trigger).not.toBeNull();

    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("button", { name: /Variant B/i }));
    expect(onSelectExperiment).toHaveBeenCalledWith({
      experimentId: "e_b",
      researchTaskId: "tsk_b",
    });
  });

  it("renders SVG fork edge endpoints at the marker center", () => {
    const input: BuildResearchMapModelInput = {
      ...emptyInput(),
      hypotheses: [
        hypothesis({ id: "h1", title: "h1" }),
        hypothesis({ id: "h2", title: "h2", createdAt: at(-25) }),
      ],
      experiments: [
        experiment({
          id: "parent",
          title: "Parent",
          createdByResearchTaskId: "tsk_parent",
          associatedHypothesisId: "h1",
        }),
        experiment({
          id: "child",
          title: "Child",
          parentExperimentId: "parent",
          createdByResearchTaskId: "tsk_child",
          associatedHypothesisId: "h2",
          createdAt: at(-15),
        }),
      ],
      entityLinks: [
        {
          id: "lnk_p",
          fromKind: "hypothesis",
          fromId: "h1",
          toKind: "experiment",
          toId: "parent",
          relationship: "tested-by",
          createdAt: at(-30),
        },
        {
          id: "lnk_c",
          fromKind: "hypothesis",
          fromId: "h2",
          toKind: "experiment",
          toId: "child",
          relationship: "tested-by",
          createdAt: at(-15),
        },
      ],
    };

    const { container } = render(<ResearchMapView input={input} />);

    const edgePath = container.querySelector("svg[viewBox='0 0 100 112'] path");
    expect(edgePath).not.toBeNull();
    expect(edgePath?.getAttribute("d")).toMatch(/^M [\d.]+ 34 C /);
    expect(edgePath?.getAttribute("d")).toMatch(/, [\d.]+ 90, [\d.]+ 90$/);
  });
});
