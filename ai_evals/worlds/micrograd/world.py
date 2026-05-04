from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

import logfire
from pydantic import BaseModel, ConfigDict, Field

from ai_evals.harness.models import AlmanacEvalOutput, CapturedToolCall, EvalEvent, EvalFinding, EvalWarning

Scenario = Literal[
    "empty_run",
    "after_baseline",
    "after_simple_variants",
    "suspicious_win",
    "synthesize_findings",
]


class MicrogradEvalInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    scenario: Scenario
    state: str
    expected_signals: list[str] = Field(
        default_factory=lambda: ["score", "accuracy", "loss", "runtime_ms", "tests_passed"]
    )


@dataclass(frozen=True)
class MicrogradEvidence:
    experiment_id: str
    components: tuple[str, ...]
    summary: str
    signals: dict[str, int | float | str | bool | None]
    raw: dict[str, Any]


MICROGRAD_RESULTS: dict[tuple[str, ...], MicrogradEvidence] = {
    ("baseline",): MicrogradEvidence(
        experiment_id="exp_baseline",
        components=("baseline",),
        summary="Baseline evidence: score=0.710 accuracy=0.500 loss=3.00 runtime_ms=10 tests_passed=True.",
        signals={"score": 0.710, "accuracy": 0.5, "loss": 3.0, "runtime_ms": 10, "tests_passed": True},
        raw={"shape": "standard", "eval_status": "ok", "components": ["baseline"]},
    ),
    ("A",): MicrogradEvidence(
        experiment_id="exp_a",
        components=("A",),
        summary="Variant A modestly improves score with low runtime cost.",
        signals={"score": 0.724, "accuracy": 0.5, "loss": 2.6, "runtime_ms": 12, "tests_passed": True},
        raw={"shape": "standard", "eval_status": "ok", "components": ["A"]},
    ),
    ("B",): MicrogradEvidence(
        experiment_id="exp_b",
        components=("B",),
        summary="Variant B improves slightly but costs more runtime.",
        signals={"score": 0.718, "accuracy": 0.5, "loss": 2.8, "runtime_ms": 35, "tests_passed": True},
        raw={"shape": "standard", "eval_status": "ok", "components": ["B"]},
    ),
    ("C",): MicrogradEvidence(
        experiment_id="exp_c",
        components=("C",),
        summary="Variant C is the strongest single change.",
        signals={"score": 0.740, "accuracy": 0.75, "loss": 2.1, "runtime_ms": 16, "tests_passed": True},
        raw={"shape": "standard", "eval_status": "ok", "components": ["C"]},
    ),
    ("A", "C"): MicrogradEvidence(
        experiment_id="exp_a_c",
        components=("A", "C"),
        summary="A+C combines well and beats either component alone.",
        signals={"score": 0.765, "accuracy": 0.75, "loss": 1.6, "runtime_ms": 22, "tests_passed": True},
        raw={"shape": "standard", "eval_status": "ok", "components": ["A", "C"]},
    ),
    ("bad",): MicrogradEvidence(
        experiment_id="exp_bad",
        components=("bad",),
        summary="Suspicious result: huge score jump with changed evidence shape.",
        signals={"score": 0.999},
        raw={"shape": "changed", "eval_status": "ok", "components": ["bad"]},
    ),
}


class MicrogradWorld:
    def __init__(self, *, expected_signals: list[str]) -> None:
        self.expected_signals = expected_signals
        self.tool_calls: list[CapturedToolCall] = []
        self.events: list[EvalEvent] = []
        self.warnings: list[EvalWarning] = []
        self.findings: list[EvalFinding] = []

    def run_experiment(self, *, content: str, components: list[str]) -> MicrogradEvidence:
        key = tuple(components or ["baseline"])
        evidence = MICROGRAD_RESULTS[key]
        with logfire.span(
            "almanac.eval.tool_call.run_experiment",
            components=",".join(components),
            experiment_id=evidence.experiment_id,
        ):
            self._capture_tool(
                "run_experiment",
                args={"content": content, "components": components},
                result={
                    "experiment_id": evidence.experiment_id,
                    "summary": evidence.summary,
                    "signals": evidence.signals,
                    "raw": evidence.raw,
                },
            )
            self._event(
                "tool_call.completed",
                f"Ran experiment {evidence.experiment_id}",
                {"tool_name": "run_experiment", "experiment_id": evidence.experiment_id},
            )
        return evidence

    def evaluate_evidence(self, evidence: MicrogradEvidence) -> list[EvalWarning]:
        with logfire.span("almanac.eval.tool_call.evaluate_evidence", experiment_id=evidence.experiment_id):
            warnings: list[EvalWarning] = []
            if evidence.raw.get("shape") != "standard":
                warnings.append(
                    EvalWarning(
                        kind="evidence_shape_changed",
                        experiment_id=evidence.experiment_id,
                        message=f"{evidence.experiment_id} changed the evidence shape.",
                    )
                )

            missing = [signal for signal in self.expected_signals if signal not in evidence.signals]
            if missing:
                warnings.append(
                    EvalWarning(
                        kind="missing_signal",
                        experiment_id=evidence.experiment_id,
                        message=f"{evidence.experiment_id} is missing expected signals: {', '.join(missing)}.",
                    )
                )

            self.warnings.extend(warnings)
            self._capture_tool(
                "evaluate_evidence",
                args={"experiment_id": evidence.experiment_id, "expected_signals": self.expected_signals},
                result={"warning_kinds": [warning.kind for warning in warnings]},
            )
            for warning in warnings:
                self._event("warning.created", warning.message, warning.model_dump())
            return warnings

    def record_finding(self, *, content: str, evidence_ids: list[str]) -> EvalFinding:
        with logfire.span("almanac.eval.tool_call.record_finding"):
            finding = EvalFinding(content=content, evidence_ids=evidence_ids)
            self.findings.append(finding)
            self._capture_tool(
                "record_finding",
                args={"content": content, "evidence_ids": evidence_ids},
                result=finding.model_dump(),
            )
            self._event("finding.created", content, finding.model_dump())
            return finding

    def output(self, content: str) -> AlmanacEvalOutput:
        return AlmanacEvalOutput(
            content=content,
            captured_tool_calls=self.tool_calls,
            events=self.events,
            warnings=self.warnings,
            findings=self.findings,
            signals={
                "tool_calls": len(self.tool_calls),
                "warnings": len(self.warnings),
                "findings": len(self.findings),
            },
        )

    def _capture_tool(self, tool_name: str, *, args: dict[str, Any], result: dict[str, Any]) -> None:
        self.tool_calls.append(CapturedToolCall(tool_name=tool_name, args=args, result=result))

    def _event(self, event_type: str, message: str, payload: dict[str, Any]) -> None:
        self.events.append(EvalEvent(event_type=event_type, message=message, payload=payload))


def run_micrograd_planning_case(args: MicrogradEvalInput) -> AlmanacEvalOutput:
    world = MicrogradWorld(expected_signals=args.expected_signals)

    if args.scenario == "empty_run":
        content = "Start by establishing baseline evidence before trying variants."
        baseline = world.run_experiment(content=content, components=["baseline"])
        world.evaluate_evidence(baseline)
        return world.output(content)

    if args.scenario == "after_baseline":
        content = "Explore simple variants A, B, and C before combining directions."
        for component in ["A", "B", "C"]:
            evidence = world.run_experiment(content=f"Try simple variant {component}.", components=[component])
            world.evaluate_evidence(evidence)
        world.record_finding(
            content="A and C look more promising than B; keep breadth before committing.",
            evidence_ids=["exp_a", "exp_b", "exp_c"],
        )
        return world.output(content)

    if args.scenario == "after_simple_variants":
        content = "A and C are the promising components, so try A+C as a combination."
        evidence = world.run_experiment(content=content, components=["A", "C"])
        world.evaluate_evidence(evidence)
        world.record_finding(
            content="A+C is the best valid combination in this fixture world.",
            evidence_ids=[evidence.experiment_id],
        )
        return world.output(content)

    if args.scenario == "suspicious_win":
        content = "Do not trust the huge bad result until evidence shape and missing signals are resolved."
        evidence = world.run_experiment(content="Probe suspicious bad variant.", components=["bad"])
        world.evaluate_evidence(evidence)
        world.record_finding(
            content="The bad variant is suspicious, not an accepted improvement.",
            evidence_ids=[evidence.experiment_id],
        )
        return world.output(content)

    if args.scenario == "synthesize_findings":
        content = "Synthesize findings from baseline, A, B, C, and A+C evidence."
        for components in [["baseline"], ["A"], ["B"], ["C"], ["A", "C"]]:
            evidence = world.run_experiment(content=f"Review evidence for {components}.", components=components)
            world.evaluate_evidence(evidence)
        world.record_finding(
            content="C improves the most among single variants, A+C is strongest overall, and B is less attractive due to runtime.",
            evidence_ids=["exp_baseline", "exp_a", "exp_b", "exp_c", "exp_a_c"],
        )
        return world.output(content)

    raise ValueError(f"Unhandled scenario: {args.scenario}")
