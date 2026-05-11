# spelling-corrector

Norvig's spelling corrector turns misspelled words into their intended forms by generating edit-distance-1 and edit-distance-2 candidates from a wordlist and ranking them by corpus frequency. The design surface for improvements is the candidate-generation strategy and the ranking function: how to bias toward shorter or longer words, what to do when the primary dictionary has no match, when to prefer rarer-but-closer candidates over common-but-distant ones, and how to handle out-of-vocabulary inputs.

This was an autoresearch run on that design surface, using a loop adapted from [karpathy/autoresearch](https://github.com/karpathy/autoresearch). A single agent edited `spell.py` against a read-only harness measuring accuracy on a held-out typo testset.

Source logbook: [scott-goodfire/logbook-autoresearch-and-spelling-corrector](https://github.com/scott-goodfire/logbook-autoresearch-and-spelling-corrector). Underlying task: [Peter Norvig — How to Write a Spelling Corrector](https://norvig.com/spell-correct.html).

## Files

- `autoresearch.md` — summary of the run: headline numbers, phase overview, what worked, what broke
- `autoresearch-frontier.png` — trajectory chart from the source logbook
- `README.md` — this file
