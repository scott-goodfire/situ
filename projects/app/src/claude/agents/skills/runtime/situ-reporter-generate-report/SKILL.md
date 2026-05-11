---
name: situ-reporter-generate-report
description: Per-invocation procedure for the situ Reporter when producing REPORT.md and the trajectory chart.
---

# Generate a Session Report

## Step 1 — Gather

Pull the data you need (see `situ-reporter-runtime`). At minimum: the research project, the chronological experiment list, per-experiment measurements, verifications, and the baseline. Skim hypotheses and entity links if relevant.

## Step 2 — Write `_make_trajectory.py` via heredoc

Use `run_report_command` with a heredoc. Approximate shape:

```bash
cat > _make_trajectory.py <<'PYEOF'
#!/usr/bin/env python3
"""Trajectory chart for situ session <session-id>."""
import matplotlib.pyplot as plt

# (chronological_index_label, durable_id, "keep"|"discard", primary_metric, held_out_or_none, short_label)
CHRONO = [
    ("exp1", "abc1234", "discard", 0.737, None, "first attempt: no penalty"),
    # ...
]

PHASES = [
    (0, 0, "Phase 0\nbaseline", "#eeeeee"),
    (1, 7, "Phase 1\nexploratory search", "#fbe9e7"),
    # ...
]

fig, ax = plt.subplots(figsize=(13, 6))

# 1) Phase backgrounds
for start, end, label, color in PHASES:
    ax.axvspan(start + 0.5, end + 1.5, color=color, alpha=0.6)

# 2) Compute running best for each row
running_best = None
spine_values = []
for r in CHRONO:
    if r[2] == "keep":
        running_best = r[3]
    spine_values.append(running_best)

# 3) Kept spine
keep_x = [i for i, r in enumerate(CHRONO) if r[2] == "keep"]
keep_y = [r[3] for r in CHRONO if r[2] == "keep"]
ax.plot(keep_x, keep_y, marker="o", color="#2e8b57", linewidth=2, label="kept (spine)")

# 4) Discards
disc_x = [i for i, r in enumerate(CHRONO) if r[2] == "discard"]
disc_y = [r[3] for r in CHRONO if r[2] == "discard"]
ax.scatter(disc_x, disc_y, marker="x", color="#cc3333", label="discarded")

# 5) Leader lines from discard points back to the running best
for i, r in enumerate(CHRONO):
    if r[2] == "discard" and spine_values[i] is not None:
        ax.plot([i, i], [spine_values[i], r[3]], color="#cc3333", linewidth=0.8, alpha=0.5)

# 6) Annotations
ax.annotate("first keep:\nfirst-letter penalty",
            xy=(8, 0.762), xytext=(30, -60),
            textcoords="offset points",
            arrowprops=dict(arrowstyle="-", color="#666"))

ax.set_xticks(range(len(CHRONO)))
ax.set_xticklabels([r[0] for r in CHRONO], rotation=45, ha="right")
ax.set_xlabel("experiment (chronological)")
ax.set_ylabel("primary metric")
ax.legend(loc="lower right")
ax.set_title("situ session — kept-commit spine + discarded experiments")
fig.tight_layout()
fig.savefig("trajectory.png", dpi=120)
PYEOF
```

Adapt CHRONO, PHASES, and annotations to the actual session. `textcoords="offset points"` is what keeps callouts readable when y-range shifts — use it for every annotation.

## Step 3 — Render the chart

Same tool, simpler call:

```bash
python3 _make_trajectory.py
```

If it errors, the tool returns the stderr — fix the script and re-run. Iterate until `trajectory.png` exists.

## Step 4 — Write `REPORT.md` via heredoc

Markdown narrative with these sections:

1. **Title** — `# situ / <goal slug> — session report`.
2. **Bottom line** — baseline → best, held-out movement if known, run duration, conclusion in one sentence.
3. **Trajectory chart** — embed via `![trajectory](trajectory.png)`.
4. **Phase narratives** — one short section per phase: what was tried, what stuck, what was discarded and why.
5. **Findings** — 2–5 bullet points distilled from the run.
6. **Methodology footnote** — model, budget, compute, caveats.

Use a heredoc like for the script:

```bash
cat > REPORT.md <<'MDEOF'
# situ / spelling-corrector — session report
...
MDEOF
```

Cite IDs inline. Don't restate the same experiment in two places. Be terse.

## Step 5 — Stop

When REPORT.md, \_make_trajectory.py, and trajectory.png all exist, your turn is complete. Do not call additional tools.
