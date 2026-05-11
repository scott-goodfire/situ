import { evalite } from "evalite";

import { MANAGER_SYSTEM } from "../../app/src/claude/agents/roles/manager/system";
import { REPORTER_SYSTEM } from "../../app/src/claude/agents/roles/reporter/system";
import { SCIENTIST_SYSTEM } from "../../app/src/claude/agents/roles/scientist/system";
import { SCRIBE_SYSTEM } from "../../app/src/claude/agents/roles/scribe/system";
import { VERIFIER_SYSTEM } from "../../app/src/claude/agents/roles/verifier/system";
import { markerScorer, type MarkerExpectation } from "./scorers/marker-scorer";

type RoleSystemCase = Readonly<{
  role: string;
  system: string;
}>;

// Manager, Scientist, and Reporter use web_search for ideation/exploration.
// Their prompts must say so explicitly and reject web claims as evidence —
// the project's evidence model is durable records only.
const ideationFramingMarkers = ["web_search", "ideation", "exploration", "never as evidence"];

const ideationRoles: RoleSystemCase[] = [
  { role: "manager", system: MANAGER_SYSTEM },
  { role: "scientist", system: SCIENTIST_SYSTEM },
  { role: "reporter", system: REPORTER_SYSTEM },
];

evalite("role system prompts frame web_search as ideation only", {
  data: () =>
    ideationRoles.map((entry) => ({
      input: entry,
      expected: {
        required: ideationFramingMarkers,
        forbidden: [],
      } satisfies MarkerExpectation,
    })),
  task: async ({ system }) => system,
  scorers: [markerScorer],
});

// Scribe gets web_search but its job is narration, not ideation. The framing
// must acknowledge web_search, narrow its use to canonical-name lookups, and
// forbid the agent from inventing activity that isn't in the event log.
evalite("scribe system prompt narrows web_search to narration support", {
  data: () => [
    {
      input: { role: "scribe", system: SCRIBE_SYSTEM } satisfies RoleSystemCase,
      expected: {
        required: ["web_search", "rarely useful", "Never use it to invent"],
        forbidden: [],
      } satisfies MarkerExpectation,
    },
  ],
  task: async ({ system }) => system,
  scorers: [markerScorer],
});

evalite("verifier system prompt does not expose web_search", {
  data: () => [
    {
      input: { role: "verifier", system: VERIFIER_SYSTEM } satisfies RoleSystemCase,
      expected: {
        required: [],
        forbidden: ["web_search"],
      } satisfies MarkerExpectation,
    },
  ],
  task: async ({ system }) => system,
  scorers: [markerScorer],
});
