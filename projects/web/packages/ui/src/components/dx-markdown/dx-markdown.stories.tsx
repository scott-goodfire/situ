import type { Meta, StoryObj } from "@storybook/react-vite";
import { DxMarkdown } from "./dx-markdown";

const meta = {
  title: "UI/Dx Markdown",
  component: DxMarkdown,
} satisfies Meta<typeof DxMarkdown>;

export default meta;

type Story = StoryObj<typeof meta>;

const TYPICAL = `## Per-task evidence cache

The verifier currently re-reads the **same evaluation rows** for every task in
a batch. Hypothesis: a per-task cache should cut wall time by 30-50%.

Open questions:

- Is the working set small enough to fit in memory?
- Does \`evidenceCount\` overcount when a task is retried?
- Should the cache be scoped per-task or per-session?

> Cited from the manager's onboarding notes — the verifier is the dominant
> cost in the acceptance-path P95.

See \`projects/app/src/runtime/dispatch/research-projects.ts\` for the entry
point.`;

const CODE_HEAVY = `# Worker prompt draft

The scientist will be asked to apply this patch. Note the explicit
\`worktreePath\` argument.

\`\`\`ts
async function applyExperiment(experiment: ExperimentRecord) {
  const worktree = await ensureWorktree(experiment);
  await runWorkspaceCommand({
    worktreePath: worktree.path,
    command: "bun run check",
  });
}
\`\`\`

After the change, the verifier should see:

\`\`\`diff
- p95: 8.4s
+ p95: 2.7s
\`\`\`

Setup steps:

\`\`\`bash
mise run check
mise run test
\`\`\`

If the SQL needs to be inspected:

\`\`\`sql
SELECT count(*) FROM research_tasks
WHERE status = 'verified'
GROUP BY hypothesis_id;
\`\`\`
`;

const GFM = `### Verification checklist

- [x] Verifier accepts the patch
- [x] P95 below 3s on the synthetic burst
- [ ] No regression on long-running sessions
- [ ] Memory ceiling holds at 1.5GB

| Variant | P95 (s) | Memory (MB) | Verdict |
| --- | ---: | ---: | --- |
| baseline | 8.4 | 1240 | — |
| per-task cache | 4.1 | 1380 | promising |
| ~~per-tenant shards~~ | 9.1 | 1612 | rejected |

Linked:
- ResearchTask: tsk_evidence_cache_proto
- Verifier: \`acceptance-path-burst-v2\`
`;

export const Typical: Story = {
  args: { children: TYPICAL },
};

export const CodeHeavy: Story = {
  args: { children: CODE_HEAVY },
};

export const GfmFeatures: Story = {
  args: { children: GFM },
};
