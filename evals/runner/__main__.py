from evals.harness.logfire import configure_eval_observability

configure_eval_observability()

from evals.runner.cli import main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(main())
