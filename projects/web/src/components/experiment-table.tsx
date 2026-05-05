import type { ExperimentRecord } from "@almanac/protocol";

export function ExperimentTable({ experiments }: { experiments: ExperimentRecord[] }) {
  return (
    <section className="band">
      <h2>Experiments</h2>
      <div className="table">
        {experiments.length === 0 && <p className="muted">None yet</p>}
        {experiments.slice(-12).map((experiment) => (
          <div className="row" key={experiment.id}>
            <span>{experiment.id}</span>
            <span>{experimentState({ experiment })}</span>
            <span>{experiment.components.join("+")}</span>
            <span>{experimentNote({ experiment })}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function experimentState({ experiment }: { experiment: ExperimentRecord }): string {
  if (experiment.suspicious) {
    return "suspicious";
  }

  return experiment.status;
}

function experimentNote({ experiment }: { experiment: ExperimentRecord }): string {
  if (experiment.suspicious_reason) {
    return experiment.suspicious_reason;
  }

  if (experiment.note) {
    return experiment.note;
  }

  return experiment.intent;
}
