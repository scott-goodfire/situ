import { compact } from "lodash-es";

function classNames({ values }: { values: Array<string | false | null | undefined> }): string {
  return compact(values).join(" ");
}

export const classNameModule = {
  classNames,
} as const;
