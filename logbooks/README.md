# logbooks

_Note: Many of the writeups in this folder are summarized by AI from prior runs and notes._

This folder collects reference runs from other autoresearch projects and methodologies, used as comparison baselines for `situ`. Each subfolder is a writeup of how a single-agent autoresearch loop performed on a specific task, along with the trajectory chart from that run.

The point of the comparison is to understand where `situ`'s design moves the needle. Concretely, the goals `situ` is being measured against:

- **Improve search** — avoid greedy single-axis hill-climbing that gets stuck on local maxima; diversify across hypotheses rather than re-tune the same knob.
- **Reduce gaming** — catch eval leakage (the Scientist copying labels from the test set), block reads of the held-out set, surface seed-hacking and quantization-level "wins" instead of locking them in as new bests.

See each subfolder's `README.md` for the project context and `autoresearch.md` for the run summary. See [`learnings.md`](./learnings.md) for the cross-cutting findings across these runs.
