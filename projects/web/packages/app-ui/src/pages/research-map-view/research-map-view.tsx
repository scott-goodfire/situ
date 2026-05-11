import { ChevronDown, GitBranch, Locate, Minus, Plus } from "lucide-react";
import { DxButton, DxIconButton, DxMultiSelect, DxPopover, DxTooltip } from "@situ/web-ui";
import { DateTime } from "luxon";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type {
  BuildResearchMapModelInput,
  ResearchMapEdge,
  ResearchMapExperimentNode,
  ResearchMapLane,
  ResearchMapMarker,
  ResearchMapModel,
  ResearchMapRange,
  ResearchMapTick,
  ResearchMapTone,
} from "./research-map-model";
import { buildResearchMapModel, formatNowLabel, xForTimestamp } from "./research-map-model";
import * as s from "./research-map-view.css";

const ROW_HEIGHT = 56;
const MARKER_CENTER_OFFSET_Y = 34;
const LABEL_COLUMN_WIDTH_PX = 320;

const MIN_ZOOM_LEVEL = 0.5;
const MAX_ZOOM_LEVEL = 8;
const DEFAULT_ZOOM_LEVEL = 1;
const ZOOM_BUTTON_FACTOR = 1.5;
const WHEEL_ZOOM_SENSITIVITY = 0.004;

const TONE_FILTERS: readonly { tone: ResearchMapTone; label: string }[] = [
  { tone: "active", label: "In progress" },
  { tone: "success", label: "Verified" },
  { tone: "warning", label: "Needs evidence" },
  { tone: "danger", label: "Failed" },
];
const ALL_FILTERABLE_TONES = TONE_FILTERS.map((entry) => entry.tone);

type ResearchMapStyle = CSSProperties & {
  "--body-height"?: string;
  "--canvas-width"?: string;
  "--lane-top"?: string;
  "--label-top"?: string;
  "--meta-top"?: string;
  "--node-x"?: string;
  "--span-left"?: string;
  "--span-width"?: string;
  "--tick-x"?: string;
  "--now-x"?: string;
};

export type ResearchMapViewProps = {
  input: BuildResearchMapModelInput;
  onSelectLane?: (input: { hypothesisId: string }) => void;
  onSelectExperiment?: (input: { experimentId: string; researchTaskId: string | null }) => void;
  /** Drop the rounded card / max-height / shadow chrome — for full-page hosts. */
  fullBleed?: boolean;
};

export function ResearchMapView({ input, onSelectExperiment, fullBleed }: ResearchMapViewProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pendingZoomScrollLeftRef = useRef<number | undefined>(undefined);
  const lastAutoScrollKeyRef = useRef<string | undefined>(undefined);
  const scrollAreaWidthPx = useElementWidth(viewportRef);
  const viewportWidthPx = Math.max(0, scrollAreaWidthPx - LABEL_COLUMN_WIDTH_PX);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL);

  const model = useMemo(
    () =>
      buildResearchMapModel({
        ...input,
        viewportWidthPx: viewportWidthPx > 0 ? viewportWidthPx : undefined,
        zoomLevel,
      }),
    [input, viewportWidthPx, zoomLevel],
  );

  const [enabledTones, setEnabledTones] = useState<Set<ResearchMapTone>>(
    () => new Set(ALL_FILTERABLE_TONES),
  );
  const toggleTone = useCallback((tone: ResearchMapTone) => {
    setEnabledTones((current) => {
      const next = new Set(current);
      if (next.has(tone)) {
        next.delete(tone);
      } else {
        next.add(tone);
      }
      return next;
    });
  }, []);

  const visibleModel = useMemo(
    () => filterModelByTones({ model, enabledTones }),
    [model, enabledTones],
  );

  const toneCounts = useMemo(() => {
    const counts = new Map<ResearchMapTone, number>();
    for (const lane of model.lanes) {
      for (const node of lane.experiments) {
        counts.set(node.tone, (counts.get(node.tone) ?? 0) + 1);
      }
    }
    return counts;
  }, [model.lanes]);

  const nowX = xForTimestamp({ range: model.range, timestamp: model.nowAt });
  const scrollToNow = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const targetCenter = (model.canvasWidthPx * nowX) / 100;
    const visibleTimelineWidth = Math.max(0, viewport.clientWidth - LABEL_COLUMN_WIDTH_PX);
    viewport.scrollLeft = Math.max(0, targetCenter - visibleTimelineWidth * 0.7);
  }, [model.canvasWidthPx, nowX]);

  const autoScrollKey = `${model.project?.id ?? "none"}:${model.range.startAt}:${
    model.range.endAt
  }:${viewportWidthPx}`;
  useLayoutEffect(() => {
    if (lastAutoScrollKeyRef.current === autoScrollKey) {
      return;
    }
    scrollToNow();
    lastAutoScrollKeyRef.current = autoScrollKey;
  }, [autoScrollKey, scrollToNow]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const nextScrollLeft = pendingZoomScrollLeftRef.current;
    if (!viewport || nextScrollLeft === undefined) {
      return;
    }
    pendingZoomScrollLeftRef.current = undefined;
    viewport.scrollLeft = Math.max(0, nextScrollLeft);
  }, [zoomLevel]);

  const zoomBy = useCallback(({ factor, clientX }: { factor: number; clientX?: number }) => {
    const viewport = viewportRef.current;
    setZoomLevel((current) => {
      const next = clampZoomLevel(current * factor);
      if (next === current) {
        return current;
      }
      if (viewport) {
        const rect = viewport.getBoundingClientRect();
        const visibleTimelineWidth = Math.max(0, viewport.clientWidth - LABEL_COLUMN_WIDTH_PX);
        const rawAnchorX =
          clientX === undefined
            ? visibleTimelineWidth / 2
            : clientX - rect.left - LABEL_COLUMN_WIDTH_PX;
        const anchorX = Math.max(0, Math.min(rawAnchorX, visibleTimelineWidth));
        pendingZoomScrollLeftRef.current =
          ((viewport.scrollLeft + anchorX) * next) / current - anchorX;
      }
      return next;
    });
  }, []);

  const zoomIn = useCallback(() => {
    zoomBy({ factor: ZOOM_BUTTON_FACTOR });
  }, [zoomBy]);
  const zoomOut = useCallback(() => {
    zoomBy({ factor: 1 / ZOOM_BUTTON_FACTOR });
  }, [zoomBy]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    let pendingDeltaY = 0;
    let pendingClientX: number | undefined;
    let frameId: number | undefined;
    const flushZoom = () => {
      frameId = undefined;
      const deltaY = pendingDeltaY;
      const clientX = pendingClientX;
      pendingDeltaY = 0;
      pendingClientX = undefined;
      if (deltaY === 0) {
        return;
      }
      zoomBy({
        factor: zoomFactorFromWheelDelta({ deltaY }),
        clientX,
      });
    };
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      event.preventDefault();
      pendingDeltaY += event.deltaY;
      pendingClientX = event.clientX;
      if (frameId === undefined) {
        frameId = window.requestAnimationFrame(flushZoom);
      }
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [zoomBy]);

  const handleSelectExperiment = useCallback(
    (node: ResearchMapExperimentNode) => {
      onSelectExperiment?.({
        experimentId: node.id,
        researchTaskId: node.experiment.createdByResearchTaskId ?? null,
      });
    },
    [onSelectExperiment],
  );

  const isEmpty = visibleModel.lanes.length === 0;
  const bodyHeight = isEmpty ? 280 : visibleModel.lanes.length * ROW_HEIGHT;
  const bodyStyle: ResearchMapStyle = { "--body-height": `${bodyHeight}px` };
  const nowStyle: ResearchMapStyle = { "--now-x": `${nowX}%` };
  const canvasStyle: ResearchMapStyle = { "--canvas-width": `${model.canvasWidthPx}px` };

  return (
    <div className={s.mapFrame} data-full-bleed={fullBleed ? "true" : undefined}>
      <ResearchMapToolbar
        model={model}
        zoomLevel={zoomLevel}
        enabledTones={enabledTones}
        toneCounts={toneCounts}
        onToggleTone={toggleTone}
        onScrollToNow={scrollToNow}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />
      <div className={s.scrollArea} ref={viewportRef}>
        <div className={s.surface} style={{ ...canvasStyle, ...bodyStyle }}>
          <div className={s.cornerCell}>
            <ResearchMapLeftHeader laneCount={visibleModel.lanes.length} />
          </div>
          <div className={s.rulerRow}>
            <TimelineRuler model={model} nowStyle={nowStyle} />
          </div>
          <div className={s.labelColumn}>
            {isEmpty ? (
              <EmptyLabelStack />
            ) : (
              visibleModel.lanes.map((lane) => <HypothesisRowLabel key={lane.id} lane={lane} />)
            )}
          </div>
          <div className={s.timelineBody}>
            <TimelineGrid ticks={model.ticks.minor} lanes={visibleModel.lanes} />
            {!isEmpty && <ResearchMapEdgeLayer model={visibleModel} bodyHeight={bodyHeight} />}
            <div className={s.nowLine} style={nowStyle} data-runstate={model.runState} />
            {visibleModel.lanes.map((lane, index) => (
              <HypothesisLaneTrack
                key={lane.id}
                lane={lane}
                laneIndex={index}
                range={model.range}
                onSelectExperiment={handleSelectExperiment}
              />
            ))}
            {isEmpty && <EmptyTimelineMessage />}
          </div>
        </div>
      </div>
      <ResearchMapLegend />
    </div>
  );
}

function clampZoomLevel(value: number): number {
  return Math.max(MIN_ZOOM_LEVEL, Math.min(value, MAX_ZOOM_LEVEL));
}

function zoomFactorFromWheelDelta({ deltaY }: { deltaY: number }): number {
  return Math.exp(-deltaY * WHEEL_ZOOM_SENSITIVITY);
}

function useElementWidth(ref: React.MutableRefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function filterModelByTones({
  model,
  enabledTones,
}: {
  model: ResearchMapModel;
  enabledTones: Set<ResearchMapTone>;
}): ResearchMapModel {
  if (enabledTones.size === ALL_FILTERABLE_TONES.length) {
    return model;
  }
  const lanes = model.lanes.flatMap((lane) => {
    const filteredLane = filterLaneByTones({ lane, enabledTones });
    return filteredLane ? [filteredLane] : [];
  });
  return {
    ...model,
    lanes,
    edges: filterEdgesByVisibleLanes({ edges: model.edges, lanes }),
  };
}

function filterLaneByTones({
  lane,
  enabledTones,
}: {
  lane: ResearchMapLane;
  enabledTones: Set<ResearchMapTone>;
}): ResearchMapLane | undefined {
  const markers = lane.markers.filter((marker) => isMarkerVisible({ marker, enabledTones }));
  if (markers.length === 0) {
    return undefined;
  }
  const experimentIds = experimentIdsFromMarkers({ markers });
  return {
    ...lane,
    markers,
    experiments: lane.experiments.filter((node) => experimentIds.has(node.id)),
  };
}

function isMarkerVisible({
  marker,
  enabledTones,
}: {
  marker: ResearchMapMarker;
  enabledTones: Set<ResearchMapTone>;
}): boolean {
  return isMapToneVisible({
    tone: marker.kind === "node" ? marker.node.tone : marker.tone,
    enabledTones,
  });
}

function isMapToneVisible({
  tone,
  enabledTones,
}: {
  tone: ResearchMapTone;
  enabledTones: Set<ResearchMapTone>;
}): boolean {
  return tone === "neutral" || enabledTones.has(tone);
}

function experimentIdsFromMarkers({ markers }: { markers: ResearchMapMarker[] }): Set<string> {
  return new Set(markers.flatMap((marker) => markerNodes({ marker }).map((node) => node.id)));
}

function markerNodes({ marker }: { marker: ResearchMapMarker }): ResearchMapExperimentNode[] {
  return marker.kind === "node" ? [marker.node] : marker.nodes;
}

function filterEdgesByVisibleLanes({
  edges,
  lanes,
}: {
  edges: ResearchMapEdge[];
  lanes: ResearchMapLane[];
}): ResearchMapEdge[] {
  const experimentIds = new Set(lanes.flatMap((lane) => lane.experiments.map((node) => node.id)));
  return edges.filter(
    (edge) => experimentIds.has(edge.fromExperimentId) && experimentIds.has(edge.toExperimentId),
  );
}

function ToneFilterMenu({
  enabledTones,
  toneCounts,
  onToggleTone,
}: {
  enabledTones: Set<ResearchMapTone>;
  toneCounts: Map<ResearchMapTone, number>;
  onToggleTone: (tone: ResearchMapTone) => void;
}) {
  const totalCount = TONE_FILTERS.length;
  const enabledCount = enabledTones.size;
  const triggerText =
    enabledCount === 0
      ? "None"
      : enabledCount === totalCount
        ? "All"
        : enabledCount === 1
          ? (TONE_FILTERS.find((entry) => enabledTones.has(entry.tone))?.label ?? "")
          : `${enabledCount} of ${totalCount}`;

  const trigger = (
    <DxButton variant="ghost">
      <span className={s.toneFilterTriggerInner}>
        <span className={s.toneFilterTriggerLabel}>Status</span>
        {triggerText}
        <ChevronDown size={12} aria-hidden="true" />
      </span>
    </DxButton>
  );

  return (
    <DxMultiSelect
      trigger={trigger}
      selected={enabledTones}
      onToggle={onToggleTone}
      compact
      items={TONE_FILTERS.map(({ tone, label }) => {
        const count = toneCounts.get(tone) ?? 0;
        return {
          value: tone,
          label: (
            <span className={s.toneFilterItemRow}>
              <span className={s.toneFilterDot} data-tone={tone} aria-hidden="true" />
              <span className={s.toneFilterItemName}>{label}</span>
              <span className={s.toneFilterItemCount}>{count}</span>
            </span>
          ),
        };
      })}
    />
  );
}

function ResearchMapToolbar({
  model,
  zoomLevel,
  enabledTones,
  toneCounts,
  onToggleTone,
  onScrollToNow,
  onZoomIn,
  onZoomOut,
}: {
  model: ResearchMapModel;
  zoomLevel: number;
  enabledTones: Set<ResearchMapTone>;
  toneCounts: Map<ResearchMapTone, number>;
  onToggleTone: (tone: ResearchMapTone) => void;
  onScrollToNow: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  const isFinished = model.runState === "finished";
  const pillTooltip = isFinished ? "Jump to finish" : "Jump to now";
  const canZoomOut = zoomLevel > MIN_ZOOM_LEVEL;
  const canZoomIn = zoomLevel < MAX_ZOOM_LEVEL;
  return (
    <div className={s.mapToolbar}>
      <div className={s.toolbarControls}>
        <ToneFilterMenu
          enabledTones={enabledTones}
          toneCounts={toneCounts}
          onToggleTone={onToggleTone}
        />
        <div className={s.zoomGroup} role="group" aria-label="Zoom">
          <DxTooltip content="Zoom out">
            <DxIconButton ariaLabel="Zoom out" disabled={!canZoomOut} onClick={onZoomOut}>
              <Minus size={14} />
            </DxIconButton>
          </DxTooltip>
          <DxTooltip content="Zoom in">
            <DxIconButton ariaLabel="Zoom in" disabled={!canZoomIn} onClick={onZoomIn}>
              <Plus size={14} />
            </DxIconButton>
          </DxTooltip>
        </div>
        <DxTooltip content={pillTooltip}>
          <DxIconButton ariaLabel={pillTooltip} onClick={onScrollToNow}>
            <Locate size={14} />
          </DxIconButton>
        </DxTooltip>
        <span className={s.nowPill} data-runstate={model.runState}>
          {isFinished ? "FINISHED " : ""}
          {formatNowLabel({ nowAt: model.nowAt, range: model.range })}
        </span>
      </div>
    </div>
  );
}

function ResearchMapLeftHeader({ laneCount }: { laneCount: number }) {
  const label = laneCount === 1 ? "1 hypothesis" : `${laneCount} hypotheses`;
  return <span className={s.headerLabel}>{label}</span>;
}

function EmptyLabelStack() {
  return (
    <div className={s.emptyLabelStack}>
      <span className={s.emptyLabelText}>No hypotheses yet</span>
    </div>
  );
}

function EmptyTimelineMessage() {
  return (
    <div className={s.emptyTimelineMessage}>
      <p className={s.emptyTimelineHeading}>Waiting for hypotheses</p>
      <p className={s.emptyTimelineDetail}>
        Hypotheses appear as the Manager records them. Experiments and forks chart along the
        timeline as they run.
      </p>
    </div>
  );
}

function HypothesisRowLabel({ lane }: { lane: ResearchMapLane }) {
  return (
    <div className={s.rowLabel} data-tone={lane.tone}>
      <span className={s.rowToneDot} aria-hidden="true" />
      <span className={s.rowTitleGroup}>
        <span className={s.rowTitle} title={lane.title}>
          {lane.title}
        </span>
      </span>
    </div>
  );
}

function TimelineRuler({
  model,
  nowStyle,
}: {
  model: ResearchMapModel;
  nowStyle: ResearchMapStyle;
}) {
  const isFinished = model.runState === "finished";
  return (
    <div className={s.ruler} data-scale={model.ticks.scaleKind}>
      {model.ticks.major.map((tick) => (
        <span key={tick.id} className={s.majorTick} style={tickStyle({ x: tick.x })}>
          {tick.label}
        </span>
      ))}
      {model.ticks.minor.map((tick) => (
        <span key={tick.id} className={s.minorTick} style={tickStyle({ x: tick.x })}>
          {tick.label}
        </span>
      ))}
      <span className={s.nowMarkerPill} style={nowStyle} data-runstate={model.runState}>
        {isFinished ? "DONE " : ""}
        {formatNowLabel({ nowAt: model.nowAt, range: model.range })}
      </span>
    </div>
  );
}

function TimelineGrid({ ticks, lanes }: { ticks: ResearchMapTick[]; lanes: ResearchMapLane[] }) {
  return (
    <>
      {ticks.map((tick) => (
        <span key={tick.id} className={s.gridLine} style={tickStyle({ x: tick.x })} />
      ))}
      {lanes.map((lane, index) => (
        <span key={lane.id} className={s.rowGuide} style={laneStyle({ index })} />
      ))}
    </>
  );
}

function HypothesisLaneTrack({
  lane,
  laneIndex,
  range,
  onSelectExperiment,
}: {
  lane: ResearchMapLane;
  laneIndex: number;
  range: ResearchMapRange;
  onSelectExperiment: (node: ResearchMapExperimentNode) => void;
}) {
  const laneTopStyle = laneStyle({ index: laneIndex });
  const showSpan = lane.experimentCount > 0;
  const spanStartX = xForTimestamp({ range, timestamp: lane.span.startAt });
  const spanEndX = xForTimestamp({ range, timestamp: lane.span.endAt });
  const spanStyle: ResearchMapStyle = {
    ...laneTopStyle,
    "--span-left": `${spanStartX}%`,
    "--span-width": `${Math.max(spanEndX - spanStartX, 2.5)}%`,
  };

  return (
    <div className={s.laneLayer} style={laneTopStyle}>
      {showSpan ? (
        <div className={s.spanBar} data-tone={lane.tone} style={spanStyle} />
      ) : (
        <div
          className={s.spanPlaceholder}
          data-tone={lane.tone}
          style={spanStyle}
          aria-hidden="true"
        />
      )}
      {lane.markers.map((marker) =>
        marker.kind === "node" ? (
          <ExperimentNodeMarker
            key={marker.node.id}
            node={marker.node}
            range={range}
            onSelect={() => onSelectExperiment(marker.node)}
          />
        ) : (
          <ClusterMarker key={marker.id} marker={marker} onSelectExperiment={onSelectExperiment} />
        ),
      )}
    </div>
  );
}

function ClusterMarker({
  marker,
  onSelectExperiment,
}: {
  marker: Extract<ResearchMapMarker, { kind: "cluster" }>;
  onSelectExperiment: (node: ResearchMapExperimentNode) => void;
}) {
  const style: ResearchMapStyle = { "--node-x": `${marker.xPercent}%` };
  const trigger = (
    <button
      className={s.clusterButton}
      data-tone={marker.tone}
      style={style}
      type="button"
      aria-label={`${marker.nodes.length} experiments at this time`}
    >
      <span className={s.clusterCount}>×{marker.nodes.length}</span>
    </button>
  );
  return (
    <DxPopover trigger={trigger} side="top">
      <div className={s.clusterMenu}>
        <p className={s.clusterMenuHeading}>{marker.nodes.length} concurrent experiments</p>
        <ul className={s.clusterMenuList}>
          {marker.nodes.map((node) => (
            <li key={node.id}>
              <button
                type="button"
                className={s.clusterMenuItem}
                data-tone={node.tone}
                onClick={() => onSelectExperiment(node)}
              >
                <span className={s.clusterMenuDot} aria-hidden="true" />
                <span className={s.clusterMenuItemTitle} title={node.title}>
                  {node.title}
                </span>
                <span className={s.clusterMenuItemTime}>{formatClusterTime(node.occurredAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </DxPopover>
  );
}

function formatClusterTime(timestamp: string): string {
  const dt = DateTime.fromISO(timestamp);
  return dt.isValid ? dt.toFormat("HH:mm:ss") : "";
}

function ExperimentNodeMarker({
  node,
  range,
  onSelect,
}: {
  node: ResearchMapExperimentNode;
  range: ResearchMapRange;
  onSelect: () => void;
}) {
  const nodeX = xForTimestamp({ range, timestamp: node.occurredAt });
  const labelTop = node.labelSlot === 0 ? 0 : 38;
  const style: ResearchMapStyle = {
    "--node-x": `${nodeX}%`,
    "--label-top": `${labelTop}px`,
  };

  return (
    <>
      {!node.labelHidden && (
        <span className={s.nodeLabel} style={style} title={node.title}>
          {node.title}
        </span>
      )}
      <button
        className={s.experimentButton}
        data-tone={node.tone}
        style={style}
        type="button"
        aria-label={`${node.title}${node.summary ? `: ${node.summary}` : ""}`}
        onClick={onSelect}
      >
        <span className={s.nodeCore} />
      </button>
    </>
  );
}

function ResearchMapEdgeLayer({
  model,
  bodyHeight,
}: {
  model: ResearchMapModel;
  bodyHeight: number;
}) {
  const edgePaths = model.edges
    .map((edge) => edgePathFromModel({ edge, model }))
    .filter((edgePath): edgePath is { edge: ResearchMapEdge; d: string } => edgePath !== undefined);

  if (edgePaths.length === 0) {
    return null;
  }

  return (
    <svg
      className={s.edgeLayer}
      viewBox={`0 0 100 ${bodyHeight}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {edgePaths.map(({ edge, d }) => (
        <path key={edge.id} className={s.edgePath} data-tone={edge.tone} d={d} />
      ))}
    </svg>
  );
}

function ResearchMapLegend() {
  return (
    <div className={s.legend}>
      <span className={s.legendItem}>
        <GitBranch size={14} />
        Experiment fork
      </span>
      <span className={s.legendItem}>
        <span className={s.legendDot} data-tone="active" />
        In progress
      </span>
      <span className={s.legendItem}>
        <span className={s.legendDot} data-tone="success" />
        Verified
      </span>
      <span className={s.legendItem}>
        <span className={s.legendDot} data-tone="warning" />
        Needs evidence
      </span>
      <span className={s.legendItem}>
        <span className={s.legendDot} data-tone="danger" />
        Failed
      </span>
    </div>
  );
}

function edgePathFromModel({
  edge,
  model,
}: {
  edge: ResearchMapEdge;
  model: ResearchMapModel;
}): { edge: ResearchMapEdge; d: string } | undefined {
  const from = nodePosition({
    model,
    experimentId: edge.fromExperimentId,
    laneId: edge.fromLaneId,
  });
  const to = nodePosition({
    model,
    experimentId: edge.toExperimentId,
    laneId: edge.toLaneId,
  });
  if (!from || !to) {
    return undefined;
  }

  const sameLane = from.y === to.y;
  const yBump = sameLane ? 34 : 0;
  const xDelta = Math.max(Math.abs(to.x - from.x) * 0.45, 8);
  const c1x = from.x + xDelta;
  const c2x = to.x - xDelta;
  const d = `M ${from.x} ${from.y} C ${c1x} ${from.y + yBump}, ${c2x} ${
    to.y + yBump
  }, ${to.x} ${to.y}`;

  return { edge, d };
}

function nodePosition({
  model,
  experimentId,
  laneId,
}: {
  model: ResearchMapModel;
  experimentId: string;
  laneId: string;
}): { x: number; y: number } | undefined {
  for (const [laneIndex, lane] of model.lanes.entries()) {
    if (lane.id !== laneId) {
      continue;
    }
    for (const marker of lane.markers) {
      if (marker.kind === "node" && marker.node.id === experimentId) {
        return { x: marker.xPercent, y: laneIndex * ROW_HEIGHT + MARKER_CENTER_OFFSET_Y };
      }
      if (marker.kind === "cluster" && marker.nodes.some((node) => node.id === experimentId)) {
        return { x: marker.xPercent, y: laneIndex * ROW_HEIGHT + MARKER_CENTER_OFFSET_Y };
      }
    }
  }
  return undefined;
}

function tickStyle({ x }: { x: number }): ResearchMapStyle {
  return { "--tick-x": `${x}%` };
}

function laneStyle({ index }: { index: number }): ResearchMapStyle {
  return { "--lane-top": `${index * ROW_HEIGHT}px` };
}
