# micrograd

A two-layer MLP trained on the 2D `moons` toy dataset (200 samples) using a tiny scalar autograd engine. The design surface is everything that affects `val_loss`: model width and depth, batch size, learning rate and decay, optimizer choice (SGD vs variants), regularization, and any feature engineering on the inputs. The problem is small enough that the loss surface is brittle — single-knob changes can collapse training entirely — and the result is more seed-sensitive than most readers expect.

This was an autoresearch run on that design surface, using a loop adapted from [karpathy/autoresearch](https://github.com/karpathy/autoresearch). A single agent edited the training script against a read-only evaluation harness, optimizing `val_loss`.

Source logbook: [scott-goodfire/logbook-autoresearch-and-micrograd](https://github.com/scott-goodfire/logbook-autoresearch-and-micrograd). Underlying task: [karpathy/micrograd](https://github.com/karpathy/micrograd).

_Note: The latest version of situ hasn't been run on this project yet — an update will be added here over the next week or two._

## Files

- `autoresearch.md` — summary of the run: headline numbers, phase overview, what worked, what broke
- `autoresearch-frontier.png` — trajectory chart from the source logbook
- `README.md` — this file
