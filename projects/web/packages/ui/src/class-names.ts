import compact from "lodash/compact";

export function classNames({
  values,
}: {
  values: Array<string | false | null | undefined>;
}): string {
  return compact(values).join(" ");
}
