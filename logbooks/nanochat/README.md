# nanochat

A small GPT language model trained from scratch on a single GPU. The design surface is everything that affects `val_bpb` (bits per byte on validation) under a fixed 5-minute training budget: model width and depth, attention window pattern, optimizer choice, learning rate schedule, batch size and the number of optimizer steps it implies. The wall-clock budget is the binding constraint — every change implicitly trades off against how many steps fit in five minutes.

This was an autoresearch run on that design surface, using a loop adapted from [karpathy/autoresearch](https://github.com/karpathy/autoresearch). A single agent edited `train.py` against a read-only data-prep harness, optimizing `val_bpb`.

Source logbook: [scott-goodfire/logbook-autoresearch-and-nanochat](https://github.com/scott-goodfire/logbook-autoresearch-and-nanochat). Underlying task: [karpathy/nanochat](https://github.com/karpathy/nanochat).

Note: `situ` hasn't been run on this project yet — an update will be added here over the next week or two.

## Files

- `autoresearch.md` — summary of the run: headline numbers, phase overview, what worked, what broke
- `autoresearch-frontier.png` — trajectory chart from the source logbook
- `README.md` — this file
