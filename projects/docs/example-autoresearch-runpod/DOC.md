---
outline: deep
---

# Example: run situ on Karpathy's `autoresearch` on a RunPod H100

A worked example of using situ to drive [Karpathy's `autoresearch`](https://github.com/karpathy/autoresearch)
on a fresh RunPod H100 pod, with [Claude Code](https://claude.ai/code) as the
guided front-end via the `/situ` skill.

End-state when you finish:

- An H100 pod on RunPod with situ + Claude Code installed.
- A persistent network volume holding `autoresearch`, the trained tokenizer, and
  every situ session.
- A long-running `situ exec` driving `autoresearch`'s 5-minute experiment loop,
  with Claude Code narrating progress in your terminal and situ's Dashboard
  visible in your laptop's browser.

::: tip Why this combination?
Karpathy's `autoresearch` is the cleanest possible target for situ: a single
file (`train.py`) to modify, a single fixed 5-minute experiment loop, and a
single scalar metric (`val_bpb`). The agent loop is well-bounded and the
ground truth is unambiguous.
:::

## Prerequisites

- A **RunPod** account with billing enabled.
- An **Anthropic API key** (`sk-ant-...`). Same key is reused by both situ
  and Claude Code.
- **SSH** on your laptop (macOS or Linux native; Windows via WSL or Git Bash).
- Optional but recommended on your laptop: a terminal you like, plus
  `~/.ssh/config` access.

## Step 1: Provision the pod

In the RunPod console, **Pods → Deploy**:

- **GPU**: 1× **H100 SXM** (more compute per dollar than NVL for this workload).
- **Template**: a recent **PyTorch + CUDA + Ubuntu 22.04** image, e.g.
  `runpod/pytorch:2.8.0-py3.11-cuda12.6-devel-ubuntu22.04`. Use the `-devel`
  variant — autoresearch's deps include compiled CUDA bits.
- **Volume**: **Network volume mounted at `/workspace`**, **100 GB**. The
  network volume persists across pod restarts; the container disk does not.
- **Ports**: keep `22/tcp` exposed for SSH. situ's web UI on `5500` will be
  reached via SSH port-forward, not a public port.

::: warning Pick a region where your GPU and your network volume coexist.
RunPod's deploy flow warns when you've selected an incompatible pair.
:::

## Step 2: Set up SSH

### 2a. Generate a keypair (laptop)

```bash
ssh-keygen -t ed25519 -C "runpod" -f ~/.ssh/runpod_ed25519
```

Optionally set a passphrase. This creates:

- `~/.ssh/runpod_ed25519` — private key (never share)
- `~/.ssh/runpod_ed25519.pub` — public key

### 2b. Upload the public key to RunPod

```bash
cat ~/.ssh/runpod_ed25519.pub | pbcopy   # macOS; on Linux pipe to xclip / paste manually
```

In the RunPod console: **Account → Settings → SSH Public Keys → Add Public
Key**, paste, save. This applies to **all new pods**.

::: tip Existing pods
If you already deployed the pod before adding the key, restart the pod or
paste the key into the pod's `~/.ssh/authorized_keys` from the RunPod web
terminal.
:::

### 2c. Add a host entry to `~/.ssh/config` (laptop)

After the pod boots, copy the **SSH over exposed TCP** values from the pod's
Connect panel — they look like `ssh root@38.80.152.148 -p 30841`. Drop this
into `~/.ssh/config` (create it if missing, then `chmod 600 ~/.ssh/config`):

```text
Host runpod_a
  HostName <ip-from-connect-panel>
  User root
  Port <port-from-connect-panel>
  IdentityFile ~/.ssh/runpod_ed25519
  LocalForward 5500 127.0.0.1:5500
  ServerAliveInterval 30
  ServerAliveCountMax 6
```

The `runpod_a` alias is intentional — when you spin up a second pod later,
`runpod_b` (and a different `LocalForward 5501 …`) is your sibling block.

### 2d. Connect

```bash
ssh runpod_a
```

First-time fingerprint prompt: type `yes` to add the host to `known_hosts`.

## Step 3: Pod-side environment

Everything below runs **on the pod**, not your laptop.

```bash
# Point situ at the persistent volume so secrets + sessions survive pod
# restart. ~/.local/bin is where the situ installer places the binary.
mkdir -p /workspace/situ-home
echo 'export SITU_HOME=/workspace/situ-home' >> ~/.bashrc
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# Most RunPod terminals send TERM=xterm-ghostty (or similar) — pod's
# terminfo doesn't know it. Force a universal one so tmux works.
echo 'export TERM=xterm-256color' >> ~/.bashrc

# Install tmux (RunPod PyTorch image doesn't include it).
apt update && apt install -y tmux

source ~/.bashrc
```

## Step 4: Install situ on the pod

```bash
curl -fsSL https://raw.githubusercontent.com/scott-goodfire/situ/main/config/scripts/install.sh | bash
source ~/.bashrc
situ --version
```

If `situ --version` doesn't print a version, fix `PATH` before continuing —
the launcher is at `~/.local/bin/situ`.

## Step 5: Configure the Anthropic key

```bash
export SITU_ANTHROPIC_KEY="sk-ant-..."
echo "export SITU_ANTHROPIC_KEY=\"$SITU_ANTHROPIC_KEY\"" >> ~/.bashrc
```

Plain shell env — the key sits in the pod's `~/.bashrc` and in
`/workspace/situ-home/secrets.json` once the web UI saves it. Same security
boundary as anything else on this VM.

## Step 6: Clone and set up `autoresearch`

```bash
# uv is autoresearch's package manager
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc

cd /workspace
git clone https://github.com/karpathy/autoresearch
cd autoresearch

uv sync                  # installs PyTorch and friends (~2-3 min)
uv run prepare.py        # downloads training data + trains BPE tokenizer (~2 min, one-time)
uv run train.py          # ~5 min baseline run — record the val_bpb at the end
```

The baseline `val_bpb` is the floor you're trying to push below. Don't skip
this — if the H100 can't run the baseline cleanly, situ won't fix it for you.

## Step 7: Register the H100 as a situ compute target

::: danger Don't skip this — situ has no automatic GPU concurrency cap.
The scheduler only gates experiment dispatch on resources you've **told it
about**. If you launch situ without any registered compute targets and the
Manager spawns multiple Scientists, each Scientist will fire its own
`uv run train.py` on the **same physical H100** simultaneously — halving
training speed at best, OOM'ing both at worst.

Register the GPU now, before launching:

```bash
nvidia-smi --query-gpu=index,name,memory.total --format=csv,noheader   # sanity-check the GPU
export SITU_SESSION_ID="ses_autoresearch_h100"
echo 'export SITU_SESSION_ID="ses_autoresearch_h100"' >> ~/.bashrc
situ compute add --session "$SITU_SESSION_ID" --pool local --kind local --label gpu0 --cuda-visible-devices 0
situ compute list --session "$SITU_SESSION_ID"
```

With one `gpu0` target registered, situ pins one `uv run train.py` to it at
a time. Other Scientist agents can still plan and edit code in parallel —
they just queue for the GPU. Reversible:
`situ compute remove <target-id> --session "$SITU_SESSION_ID"` using the id
printed by `situ compute list`.
:::

## Step 8: Install Claude Code on the pod

```bash
curl -fsSL https://claude.ai/install.sh | bash
source ~/.bashrc
claude --version
```

## Step 9: Authenticate Claude Code

On a headless pod (no browser for the OAuth flow), reuse situ's Anthropic key:

```bash
export ANTHROPIC_API_KEY="$SITU_ANTHROPIC_KEY"
echo 'export ANTHROPIC_API_KEY="$SITU_ANTHROPIC_KEY"' >> ~/.bashrc
```

(Different env var name: Claude Code reads `ANTHROPIC_API_KEY`, situ reads
`SITU_ANTHROPIC_KEY`. Same value works for both.)

## Step 10: Install the situ skill

```bash
situ skill install
```

Writes `~/.claude/skills/situ/SKILL.md` on the pod. From any Claude Code
session on this pod, typing `/situ` invokes the skill.

## Step 11: Launch Claude inside tmux

```bash
tmux new -s situ
cd /workspace/autoresearch
claude
```

`tmux` matters — if your SSH drops, the Claude session keeps running on
the pod. Reattach later with `tmux attach -t situ`.

## Step 12: Run the skill

::: danger Do not follow `program.md` as written
autoresearch's `program.md` describes an experiment loop that **conflicts
with how situ runs experiments**:

- `program.md` mandates **in-place mutation**: edit `train.py` on a single
  dedicated branch (`autoresearch/<tag>`), `git commit` each change, write
  `run.log` and `results.tsv` directly into `/workspace/autoresearch`,
  revert losing changes with `git reset --hard`.
- situ does the opposite: each experiment runs in an **isolated git
  worktree**, the source workspace stays read-only, and results are
  recorded as **Measurements in the session DB** rather than rows in a
  TSV on disk.

If you tell the Scientist agent to "follow `program.md` exactly", `explore`-
type tasks (e.g. the baseline reading task the Manager creates first) will
trip situ's source-workspace safety guards and self-reject with messages
like _"do not create run.log, results.tsv, or other command-output files
in the source workspace."_ The `exploit`-type tasks will still run, but in
worktrees — making half of `program.md` moot.

**Use program.md as context on the project goals and the `train.py`
knobs, but write the objective in situ-native terms** (single metric,
allowed file edits, "ignore program.md's experiment loop"). The
objective in this guide already does this — copy it verbatim.
:::

Inside Claude, type:

```text
/situ
```

Claude follows the skill steps:

1. Checks `situ --version`. ✅ already installed.
2. Looks for the Anthropic key. ✅ found via `$SITU_ANTHROPIC_KEY`.
3. **Asks which directory.** Say: _"the current one, `/workspace/autoresearch`"_.
4. **Asks for the objective.** **Do not tell situ to follow `program.md`** —
   see the danger callout above. Use a situ-native objective that just
   states the metric and constraints:

   ::: code-group

   ```text [objective]
   Improve val_bpb on Karpathy's autoresearch in /workspace/autoresearch.
   The training entrypoint is `uv run train.py`, which trains a small GPT
   for a fixed 5-minute time budget and prints a summary line starting
   with `val_bpb:` (lower is better — this is the only metric).

   For each experiment:
   - Modify only `train.py`. Do not modify `prepare.py`. Do not change
     dependencies in `pyproject.toml` / `uv.lock`.
   - Run `uv run train.py`, capture stdout, parse the `val_bpb:` line.
     Also capture `peak_vram_mb:`, `num_params_M:`, and `num_steps:` from
     the same summary.
   - Treat any run that exceeds ~10 wall-clock minutes or crashes as a
     failure.
   - VRAM is a soft constraint — modest increases are fine for meaningful
     val_bpb gains, but the H100's 80GB is the hard ceiling.
   - All else equal, prefer simpler changes. A val_bpb tie that removes
     code beats a val_bpb tie that adds it.

   The first experiment is the unmodified baseline. Subsequent experiments
   should explore meaningful axes: optimizer LRs (EMBEDDING_LR,
   UNEMBEDDING_LR, MATRIX_LR, SCALAR_LR), WEIGHT_DECAY, ADAM_BETAS,
   WARMDOWN_RATIO, DEPTH, DEVICE_BATCH_SIZE, WINDOW_PATTERN, attention
   architecture (head count, head dim, GQA), MLP shape, activation,
   embedding/unembedding tying — anything in the source is fair game.

   Ignore the experiment-loop instructions in `program.md` entirely
   (single branch, results.tsv, git reset semantics, etc.). situ runs
   each experiment in its own isolated worktree and records results as
   Measurements in the session DB — do not try to mutate the source
   workspace, manage a dedicated branch, or write run.log/results.tsv
   into /workspace/autoresearch. Use program.md only as background on
   the project's goals and the train.py knobs.
   ```

   :::

5. **Asks for the timeout.** Say "8 hours" (overnight) or accept the 4-hour
   default for a first run.
6. Launches `situ exec` in the background with the captured objective and
   timeout, prints the local web URL.
7. Starts tailing `situ events --follow` and translating events into
   plain-language updates.

## Step 13: Watch live

With the `ssh runpod_a` connection still open on your laptop, open

```text
http://127.0.0.1:5500
```

in your laptop's browser. The situ Dashboard fills in as the Manager plans
research tasks and the Scientist runs experiments. Switch to **Activities**
in the sidebar if Claude says the run is blocked on a user question.

## Step 14: Disconnect and reconnect

You're free to walk away as soon as the run is launched.

**Detach and disconnect:**

```text
Ctrl-b d              # detach from tmux
exit                  # close SSH
```

Both situ and Claude survive — they live inside tmux on the pod.

**Reconnect later:**

```bash
ssh runpod_a          # reopens the LocalForward
tmux attach -t situ   # rejoin Claude's narration
```

Open `http://127.0.0.1:5500` again to see the Dashboard.

In a second tmux pane (`Ctrl-b "` splits horizontally), terminal-side checks:

```bash
situ status                       # one-glance summary
situ events --follow --limit 50   # live event tail
situ sessions                     # session id for `situ resume` later
```

## Step 15: Stop

Either let the timeout expire (situ exits with code 0 when the loop reaches
idle, 2 when timeout hits), or stop early:

```bash
tmux attach -t situ
# tell Claude to stop, or:
pkill -f "situ exec"
```

To resume the same session against the same repo later (e.g. after a pod
restart), situ remembers it by working directory:

```bash
cd /workspace/autoresearch
situ resume <session-id> --timeout 7200
```

`<session-id>` comes from `situ sessions`.

## Cost & sizing notes

- **GPU.** H100 SXM at RunPod is typically the best $/throughput for
  autoresearch's 5-min experiments. NVL has more VRAM (94 GB vs 80 GB) but
  the workload doesn't need it.
- **Volume.** 100 GB is fine. Each experiment is its own git worktree (~1
  GB), HuggingFace + pip caches accumulate; expect 40-70 GB used after a
  full overnight run.
- **Anthropic spend.** Multi-hour situ runs make a lot of Claude calls.
  Start with `--timeout 14400` (4 h) before committing to overnight; check
  the API console for spend.
- **Pod idle cost.** Stop the pod when `situ status` says complete. RunPod
  charges by the hour.

## Troubleshooting

| Symptom                                               | Fix                                                                                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `situ --version` not found                            | `export PATH="$HOME/.local/bin:$PATH"` then `source ~/.bashrc`.                                                                                 |
| `tmux: missing or unsuitable terminal: xterm-ghostty` | `export TERM=xterm-256color`, then retry. Persist in `~/.bashrc`.                                                                               |
| `Permission denied (publickey)` from `ssh runpod_a`   | Key wasn't uploaded before the pod deployed — restart the pod or paste the public key into `~/.ssh/authorized_keys` from RunPod's web terminal. |
| Web UI doesn't load on `http://127.0.0.1:5500`        | Your SSH session needs to be open for the `LocalForward` to work. Reconnect with `ssh runpod_a`.                                                |
| `uv run train.py` OOMs at baseline                    | The pod isn't actually an H100, or another process is holding VRAM (`nvidia-smi`). Stop and redeploy.                                           |

## Variations

- **Skip Claude Code.** If you don't want the narrative layer, replace
  steps 8-12 with:

  ```bash
  tmux new -s situ
  cd /workspace/autoresearch
  situ exec --objective "<objective from step 12>" --timeout 28800
  ```

  Same outcome, no narrator.

- **Multiple pods in parallel.** Add `Host runpod_b` to `~/.ssh/config`
  with `LocalForward 5501 127.0.0.1:5500`, repeat steps 3-12 on each pod.
  Watch each at `http://127.0.0.1:5500` and `http://127.0.0.1:5501` from
  your laptop.

## See also

- [Getting started](/getting-started)
- [CLI reference](/cli)
- [Karpathy's autoresearch repo](https://github.com/karpathy/autoresearch)
