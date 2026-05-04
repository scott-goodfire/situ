from __future__ import annotations

from typing import Any

import logfire

from evals.harness.models import AlmanacEvalOutput, CapturedToolCall, EvalEvent, EvalFinding, EvalWarning
from evals.worlds.micrograd.fixtures import MICROGRAD_RESULTS
from evals.worlds.micrograd.models import MicrogradEvidence


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
