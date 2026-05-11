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
  required: readonly string[];
  forbidden?: readonly string[];
}>;

type MemoryCase = Readonly<{
  name: string;
  userMessage: string;
  expectation: CaseExpectation;
}>;

const moduleDir = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = join(
  moduleDir,
  "../../app/src/claude/agents/skills/runtime/situ-manager-runtime/SKILL.md",
);

const newWinSnapshot = `Project phase: search.

You just received a verified ResearchTask result. Summary:

  ResearchTask: exploit "Add first-letter prior" · hypothesis H_FL
  Experiment: E_FL · commit abc1234
  Verification: passed · Δ +0.014 dev_accuracy (0.748 → 0.762)
  Hypothesis axis: first-letter prior (correction() filters to candidates that share first char with input, with fallback)
  Potential combinable axes (open hypotheses on independent code paths): OOV fallback, length-asymmetric scoring

/mnt/memory/best-threads.md currently contains only its header — this is the first verified win of the run.
/mnt/memory/learnings.md is empty.

Produce exactly two blocks separated by a blank line.

Block 1: the full updated contents of /mnt/memory/best-threads.md after you record this win.
Block 2: the new paragraph you would append to /mnt/memory/learnings.md.

Reply with only those two blocks — no preamble, no closing remarks.`;

const cases: readonly MemoryCase[] = [
  {
    name: "writes_well_formed_entries_after_first_win",
    userMessage: newWinSnapshot,
    expectation: {
      required: ["first-letter prior", "abc1234", "+0.014", "E_FL", "OOV"],
      forbidden: ["I would call", "create_research_task"],
    },
  },
];

const scorer = {
  name: "manager-memory-entries",
  description: "Manager-emitted memory entries contain required durable identifiers.",
  scorer: ({ output, expected }: { output: string; expected: CaseExpectation }) => {
    const normalized = normalizeMarkerText({ value: output });
    const missing = expected.required.filter(
      (marker) => !normalized.includes(normalizeMarkerText({ value: marker })),
    );
    const forbiddenHits = (expected.forbidden ?? []).filter((marker) =>
      normalized.includes(normalizeMarkerText({ value: marker })),
    );
    return {
      score: missing.length === 0 && forbiddenHits.length === 0 ? 1 : 0,
      metadata: { missing, forbiddenHits, output },
    };
  },
};

evalite("manager memory maintenance", {
  data: async () => {
    const apiKey = await getAnthropicKey();
    if (!apiKey) {
      throw new Error(
        "manager-memory-maintenance eval requires SITU_ANTHROPIC_KEY or ~/.situ/secrets.json to be set.",
      );
    }
    return cases.map((evalCase) => ({ input: evalCase, expected: evalCase.expectation }));
  },
  task: async (input: MemoryCase): Promise<string> => {
    const apiKey = await getAnthropicKey();
    if (!apiKey) {
      throw new Error("Anthropic key unavailable.");
    }
    const skill = await readFile(SKILL_PATH, "utf8");
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: DEFAULT_CLAUDE_AGENT_MODEL,
      max_tokens: 1024,
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
