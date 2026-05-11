export const INSTRUCTIONS_BODY = `# situ first-run setup

You are helping the user set up situ on this machine and start their
first research project. Follow these steps in order. Stop and ask the
user a question whenever the step says so; otherwise keep going without
prompting.

## 1. Verify situ is installed

Run \`situ --version\`. If the command is missing, tell the user to
install situ first with:

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/scott-goodfire/situ/main/config/scripts/install.sh | bash
\`\`\`

and that they may need \`export PATH="$HOME/.local/bin:$PATH"\` on their
\`PATH\`. Wait for them to confirm install before continuing.

## 2. Configure the Anthropic API key

situ reads the key from either:

- the \`SITU_ANTHROPIC_KEY\` environment variable, or
- \`~/.situ/secrets.json\` (created by the web UI or by this step).

Check both. If neither has a value, ask the user to paste their key.
Treat the response as a secret — do not echo it back, do not log it,
and do not store it anywhere besides the secrets file.

Save it by writing \`~/.situ/secrets.json\` with mode \`0600\`:

\`\`\`bash
mkdir -p "$HOME/.situ"
chmod 700 "$HOME/.situ"
umask 077
cat > "$HOME/.situ/secrets.json" <<'JSON'
{
  "anthropicKey": "<PASTE_KEY_HERE>",
  "updatedAt": "<ISO_TIMESTAMP>"
}
JSON
chmod 600 "$HOME/.situ/secrets.json"
\`\`\`

Replace \`<PASTE_KEY_HERE>\` with the user's key and \`<ISO_TIMESTAMP>\`
with the current ISO-8601 UTC timestamp. Do not commit the file or
include the key in any other shell history.

## 3. Pick a target directory

Ask the user which repository or directory they want to investigate.
\`cd\` into that directory so the session lands there. If the current
directory already looks right (e.g. the user opened Claude in their
target repo), confirm with one sentence and proceed without changing
directories.

## 4. Register compute resources

situ's scheduler only gates experiment concurrency on resources you have
told it about. If you skip this step and the project needs a GPU,
multiple Scientists will fire concurrent training runs on the same
physical GPU and either slow each other down or OOM.

Glance at the project to decide whether it needs special compute (look
for \`torch\`, \`cuda\`, \`vllm\`, large training scripts, \`.cu\` files,
etc.). Then ask the user one short question: *"This project looks like
it needs a GPU per experiment — should I register the available GPUs as
situ compute targets so the scheduler serializes experiment dispatch?"*
(Substitute "a GPU per experiment" with what you actually saw.)

If yes (or if it's clearly a GPU workload):

\`\`\`bash
# Pick a session id and reuse it when launching situ exec.
SESSION_ID="ses_$(date -u +%Y%m%d%H%M%S)"

# Inspect what's available
nvidia-smi --query-gpu=index,name,memory.total --format=csv,noheader

# Register each visible GPU as its own compute target so the scheduler
# pins one experiment per GPU
situ compute add --session "$SESSION_ID" --pool local --kind local --label gpu0 --cuda-visible-devices 0
# Repeat with --label gpu1 --cuda-visible-devices 1 etc. for additional GPUs.

situ compute list --session "$SESSION_ID"
\`\`\`

Skip this step entirely if the project doesn't need accelerators (pure
analysis, docs, lightweight CPU tasks). The user can always add targets
later with \`situ compute add --session <session-id>\` and remove them with
\`situ compute remove <target-id> --session <session-id>\`.

## 5. Define the research objective

Before launching, ask the user what they want situ to investigate or
optimize. Aim for a single concrete sentence with a success criterion
the Manager can plan against — e.g. "cut verifier acceptance-path P95
from 8s to under 3s under sustained peak load", not "make the verifier
faster". If their first answer is vague, push back once for something
measurable, then move on.

Also ask how long they want to give it. Default to 4 hours
(\`--timeout 14400\`) if they have no preference — tell them that's the
default and they can override.

## 6. Launch (headless exec)

\`situ exec\` is a long-running blocking command (up to the timeout the
user picked). Launch it **in the background** so you stay responsive
to the user — in Claude Code, that means \`Bash\` with
\`run_in_background: true\`. Equivalent backgrounding in other agents.

\`\`\`bash
# Run one of these.
# If you registered compute above, reuse the same SESSION_ID:
situ exec --session "$SESSION_ID" --objective "<their objective>" --timeout <seconds>

# Otherwise:
situ exec --objective "<their objective>" --timeout <seconds>
\`\`\`

Once it starts, the command prints a local URL (default
\`http://127.0.0.1:5500\`). Surface that URL to the user — they can
open it anytime to watch the Dashboard live while you narrate from
here. If they explicitly want the UI-driven flow instead of the
headless one, switch to \`situ app\` and let them define the objective
in the UI.

## 7. Narrate live progress

While situ is running, tail \`situ events --follow\` with the agent's
streaming-monitor primitive (the \`Monitor\` tool in Claude Code, or
equivalent) so each meaningful event becomes a notification rather
than something you poll for. Pipe the stream through a tight
\`grep --line-buffered\` filter that keeps only the event categories
you'll narrate — Manager planning, Scientist experiment lifecycle,
Verifier outcomes, and hypothesis creation — and drops heartbeats,
scheduler ticks, polling, and internal RPC noise. Each surfaced line gets translated into one
plain-language update for the user.

Surface beats like:

- "Manager is breaking down your objective into research tasks…"
- "Scientist spawned to explore [topic]"
- "Experiment '[title]' started — testing [hypothesis]"
- "Verifier accepted result: [one-line takeaway]"
- "New hypothesis: [title]"
- "Run complete — final report ready"

Filter out routine heartbeats, scheduler ticks, polling, and anything
that reads as internal RPC noise. Group consecutive events from the
same actor into a single narrative beat. Pace yourself — one clear
update per meaningful moment, not a firehose. Aim for the texture of a
research lab assistant briefing the lead investigator over the
shoulder.

## 8. Stop

Stop streaming once the user explicitly says they are done, the run
completes, or the project errors out. Summarize what happened in
2–3 sentences and point them at \`situ status\` for a deeper readout.
`;

export const SKILL_NAME = "situ";

export const SKILL_DESCRIPTION =
  "Walk the user through situ first-run setup — Anthropic key, target directory, research objective, headless launch, and live narration of agent activity.";

export function skillMarkdown(): string {
  return `---
name: ${SKILL_NAME}
description: ${SKILL_DESCRIPTION}
---

${INSTRUCTIONS_BODY}`;
}
