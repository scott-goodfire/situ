export class PreconditionError extends Error {
  readonly code: string;
  readonly hint: string;
  readonly details?: Record<string, unknown>;

  constructor(args: { code: string; hint: string; details?: Record<string, unknown> }) {
    super(`[${args.code}] ${args.hint}`);
    this.name = "PreconditionError";
    this.code = args.code;
    this.hint = args.hint;
    this.details = args.details;
  }
}
