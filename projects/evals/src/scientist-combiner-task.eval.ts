import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import Anthropic from "@anthropic-ai/sdk";
import { evalite } from "evalite";

import { DEFAULT_CLAUDE_AGENT_MODEL } from "../../app/src/claude/agents/roles/models";
import { SCIENTIST_SYSTEM } from "../../app/src/claude/agents/roles/scientist/system";
import { getAnthropicKey } from "../../app/src/secrets/local-secret-store";
import { normalizeMarkerText } from "./scorers/marker-scorer";

type CaseExpectation = Readonly<{
  required: readonly string[];
  forbidden?: readonly string[];
}>;

type CombinerCase = Readonly<{
  name: string;
  userMessage: string;
  expectation: CaseExpectation;
}>;

const moduleDir = dirname(fileURLToPath(import.meta.url));
const RUNTIME_SKILL_PATH = join(
  moduleDir,
  "../../app/src/claude/agents/skills/runtime/situ-scientist-runtime/SKILL.md",
);
const EXPLOIT_SKILL_PATH = join(
  moduleDir,
  "../../app/src/claude/agents/skills/runtime/situ-scientist-exploit-task/SKILL.md",
);

const combinerWorkerPrompt = `You are picking up the following exploit ResearchTask:

  Title: combine: first-letter prior + OOV fallback
  Type: exploit
  Target hypothesis: H_COMBINE_FL_OOV (a combiner hypothesis covering the two parent axes)

  workerPrompt:
    Start from the lab baseline commit (not from either parent experiment worktree).
    Layer both of these changes into a single candidate on spell.py:
      - first-letter prior from parent experiment E_FL @ commit abc1234 (correction() filters to candidates sharing first char with input, with fallback)
      - OOV fallback from parent experiment E_OOV @ commit def5678 (/usr/share/dict/words consulted only when the big.txt pool is empty)
    Run python harness.py and record the joint dev_accuracy via create_experiment + create_evaluation + create_measurement.
    Cite both parent experiment ids and commits in the experiment summary.

  verificationPrompt:
    Pass only if the candidate applies both parent changes atop the lab baseline,
    the harness ran fresh, and the joint dev_accuracy is captured as a Measurement
    on the new Experiment with both parent experiment ids cited.

Outline the plan you would execute for this ResearchTask in 5–8 short bullets. Do not call any tools yet — just describe the plan.`;

const cases: readonly CombinerCase[] = [
  {
    name: "plans_combiner_with_both_parents_from_baseline",
    userMessage: combinerWorkerPrompt,
    expectation: {
      required: ["abc1234", "def5678", "first-letter", "OOV", "baseline", "harness"],
      forbidden: ["fail_research_task", "split it", "underspecified"],
    },
  },
];

const scorer = {
  name: "scientist-combiner-plan",
  description: "Scientist plan references both parents, baseline start, and harness run.",
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

evalite("scientist combiner task", {
  data: async () => {
    const apiKey = await getAnthropicKey();
    if (!apiKey) {
      throw new Error(
        "scientist-combiner-task eval requires SITU_ANTHROPIC_KEY or ~/.situ/secrets.json to be set.",
      );
    }
    return cases.map((evalCase) => ({ input: evalCase, expected: evalCase.expectation }));
  },
  task: async (input: CombinerCase): Promise<string> => {
    const apiKey = await getAnthropicKey();
    if (!apiKey) {
      throw new Error("Anthropic key unavailable.");
    }
    const [runtimeSkill, exploitSkill] = await Promise.all([
      readFile(RUNTIME_SKILL_PATH, "utf8"),
      readFile(EXPLOIT_SKILL_PATH, "utf8"),
    ]);
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: DEFAULT_CLAUDE_AGENT_MODEL,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: `${SCIENTIST_SYSTEM}\n\n${runtimeSkill}\n\n${exploitSkill}`,
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
