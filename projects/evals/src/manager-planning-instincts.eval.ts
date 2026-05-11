import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import Anthropic from "@anthropic-ai/sdk";
import { evalite } from "evalite";

import { DEFAULT_CLAUDE_AGENT_MODEL } from "../../app/src/claude/agents/roles/models";
import { MANAGER_SYSTEM } from "../../app/src/claude/agents/roles/manager/system";
import { getAnthropicKey } from "../../app/src/secrets/local-secret-store";
import { normalizeMarkerText } from "./scorers/marker-scorer";

type CaseExpectation = Readonly<{
  requiredAnyOf: readonly string[];
  forbidden?: readonly string[];
}>;

type PlanningCase = Readonly<{
  name: string;
  userMessage: string;
  expectation: CaseExpectation;
}>;

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = join(
  __dirname,
  "../../app/src/claude/agents/skills/runtime/situ-manager-runtime/SKILL.md",
);

const combinerSnapshot = `Project phase: search. Per-turn ResearchTask budget: 1.

Your private memory at /mnt/memory/best-threads.md currently shows:

| axis | parent experiment | parent commit | cumulative Δ | last touched | combinable with |
|---|---|---|---|---|---|
| first-letter prior | E_FL | abc1234 | +0.014 (0.748 → 0.762) | 2026-05-11T12:54Z | OOV-fallback |
| OOV fallback | E_OOV | def5678 | +0.012 (0.762 → 0.774) | 2026-05-11T13:10Z | first-letter prior |

Recent verified ResearchTasks (oldest first):
  exploit (verified) · "Add first-letter prior" · hypothesis H_FL · Δ +0.014 dev_accuracy
  exploit (verified) · "Add /usr/share/dict OOV fallback" · hypothesis H_OOV · Δ +0.012 dev_accuracy

You have one ResearchTask slot this turn. State the title of the ResearchTask you will file. Reply with only the title — no explanation, no other text.`;

const parallelSnapshot = `Project phase: search. Per-turn ResearchTask budget: 3.

No exploit lineages have landed wins yet. /mnt/memory/best-threads.md is empty.

Stranded triage hypotheses (none ever promoted):
  H_LEN — "Length-asymmetric scoring (DELETE_PENALTY, INSERT_BONUS): most typos drop letters."
  H_KEY — "QWERTY-adjacency-aware substitution scoring: penalize non-adjacent substitutions."
  H_BIG — "Character-bigram naturalness term in correction(): downweight unnatural letter pairs."

These three hypotheses touch independent regions of spell.py and do not share mutable state. You have a budget of 3 ResearchTask slots this turn. State the titles of the ResearchTask(s) you will file. Reply with one title per line, no explanation, no other text.`;

const cases: readonly PlanningCase[] = [
  {
    name: "combiner_first_when_two_orthogonal_wins",
    userMessage: combinerSnapshot,
    expectation: {
      requiredAnyOf: ["combine:", "combiner", "Combine"],
      forbidden: ["Deepen first-letter", "Tune first-letter", "Deepen OOV"],
    },
  },
  {
    name: "parallelize_three_independent_explores",
    userMessage: parallelSnapshot,
    expectation: {
      requiredAnyOf: ["H_LEN", "Length-asymmetric"],
      forbidden: ["only one", "one at a time", "wait for"],
    },
  },
];

const scorer = {
  name: "manager-planning-instinct",
  description: "Manager output contains the expected instinct marker and no anti-pattern.",
  scorer: ({ output, expected }: { output: string; expected: CaseExpectation }) => {
    const normalized = normalizeMarkerText({ value: output });
    const anyRequiredHit = expected.requiredAnyOf.some((marker) =>
      normalized.includes(normalizeMarkerText({ value: marker })),
    );
    const forbiddenHits = (expected.forbidden ?? []).filter((marker) =>
      normalized.includes(normalizeMarkerText({ value: marker })),
    );
    return {
      score: anyRequiredHit && forbiddenHits.length === 0 ? 1 : 0,
      metadata: {
        anyRequiredHit,
        forbiddenHits,
        output,
      },
    };
  },
};

evalite("manager planning instincts", {
  data: async () => {
    const apiKey = await getAnthropicKey();
    if (!apiKey) {
      throw new Error(
        "manager-planning-instincts eval requires SITU_ANTHROPIC_KEY or ~/.situ/secrets.json to be set.",
      );
    }
    return cases.map((evalCase) => ({ input: evalCase, expected: evalCase.expectation }));
  },
  task: async (input: PlanningCase): Promise<string> => {
    const apiKey = await getAnthropicKey();
    if (!apiKey) {
      throw new Error("Anthropic key unavailable.");
    }
    const skill = await readFile(SKILL_PATH, "utf8");
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: DEFAULT_CLAUDE_AGENT_MODEL,
      max_tokens: 512,
      system: [
        {
          type: "text",
          text: `${MANAGER_SYSTEM}\n\n${skill}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: input.userMessage }],
    });
    return response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");
  },
  scorers: [scorer],
});
