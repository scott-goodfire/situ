/**
 * Loose marker for any situ repository — a typed object holding methods
 * over a single record kind. Apply via `satisfies BaseRepository<XyzRecord>`
 * to repositories whose shape doesn't match the canonical get-by-id pair:
 * append-only event streams, queue stores, anything claim/list-shaped
 * rather than fetch-shaped.
 *
 * The `Row` generic is a phantom — nothing at runtime sets `__recordType`.
 * It's preserved at the type level so tooling and reviewers can see what
 * record kind a repository handles at a glance.
 */
export type BaseRepository<Row = unknown> = {
  readonly [other: string]: unknown;
} & {
  readonly __recordType?: Row;
};

/**
 * Canonical shape for situ repositories — typed access to a single record
 * kind via string-keyed `get` + `require`. Apply via
 * `satisfies Repository<XyzRecord, "xyzId">` after the concrete repository
 * object so it keeps its specific input shapes, additional methods, and
 * per-method type inference.
 *
 * The type enforces only the canonical read pair because the universal
 * vocabulary stops there (see `situ-policy-repository-module-shape`).
 * Everything else varies by record kind:
 *
 * - status records add `accept`/`submit`/`complete`/`cancel`/`fail`/`transition`
 * - compute targets add `claim`/`release`/`heartbeat`/`drain`/`restore`
 * - measurements use `record` instead of `create`
 * - artifacts/baselines have specialized create variants
 *
 * Number-keyed records (e.g., `appEvents` with autoincrement ids) use
 * `NumberKeyedRepository` instead. Append-only / queue-shaped repos
 * (e.g., `workItems`, `claudeAgentEvents`) use `BaseRepository`.
 */
export type Repository<Row, IdKey extends string> = BaseRepository<Row> & {
  get: (input: { [K in IdKey]: string }) => Promise<Row | undefined>;
  require: (input: { [K in IdKey]: string }) => Promise<Row>;
};

/**
 * Variant of `Repository` for records keyed by a number rather than a
 * string — typically rows with autoincrement integer primary keys
 * (`appEvents`). Apply via
 * `satisfies NumberKeyedRepository<XyzRecord, "xyzId">`.
 */
export type NumberKeyedRepository<Row, IdKey extends string> = BaseRepository<Row> & {
  get: (input: { [K in IdKey]: number }) => Promise<Row | undefined>;
  require: (input: { [K in IdKey]: number }) => Promise<Row>;
};
